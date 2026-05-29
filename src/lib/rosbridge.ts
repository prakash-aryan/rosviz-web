import { EventEmitter } from "events";
import type {
  ROSMessage,
  ROSCallback,
  ROSMessageData,
  ROSMessageBase,
} from "@/types/ros";

function isBase64(s: string): boolean {
  return s.length > 0 && s.length % 4 === 0 && /^[A-Za-z0-9+/]+=*$/.test(s);
}

class ROSBridge extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string = "";
  private connected: boolean = false;
  private subscriptions: Map<
    string,
    { messageType: string; callbacks: ROSCallback<unknown>[] }
  > = new Map();
  private connectPromise: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt: number = 0;
  private readonly RECONNECT_BASE_MS = 1000;
  private readonly RECONNECT_MAX_MS = 30000;

  async connect(url: string = "ws://localhost:9090"): Promise<void> {
    if (this.connected) return;
    if (this.connectPromise) return this.connectPromise;

    this.url = url;
    this.connectPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.ws.binaryType = "arraybuffer";

        this.ws.onopen = () => {
          console.log("Connected to ROSBridge server");
          this.connected = true;
          this.reconnectAttempt = 0;
          this.emit("connected");
          this.resubscribeAll();
          this.connectPromise = null;
          resolve();
        };

        this.ws.onclose = () => {
          console.log("Disconnected from ROSBridge server");
          this.connected = false;
          this.emit("disconnected");
          this.connectPromise = null;
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.warn("ROSBridge WebSocket unavailable:", error);
          if (!this.connected) {
            this.connectPromise = null;
            reject(error);
          }
        };

        this.ws.onmessage = this.handleMessage.bind(this);
      } catch (error) {
        console.error("Error connecting to ROSBridge:", error);
        this.connectPromise = null;
        reject(error);
      }
    });

    return this.connectPromise;
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      if (data.op === "service_response") {
        this.emit(`response:${data.id}`, data);
        return;
      }

      if (data.op === "param_response") {
        this.emit(`response:${data.id}`, data);
        return;
      }

      if (data.op === "publish" && data.topic && data.msg) {
        const subscription = this.subscriptions.get(data.topic);
        if (subscription) {
          const msg = data.msg as ROSMessageData;
          if (msg.data && typeof msg.data === "string" && isBase64(msg.data)) {
            msg.data = this.base64ToUint8Array(msg.data);
          }
          subscription.callbacks.forEach((callback) => {
            try {
              callback(msg);
            } catch (err) {
              console.error(`[rosbridge] Callback error on topic ${data.topic}:`, err);
            }
          });
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private resubscribeAll() {
    console.log("Resubscribing to all topics...");
    for (const [topic, { messageType }] of this.subscriptions) {
      this.sendSubscription(topic, messageType);
    }
  }

  private sendSubscription(topic: string, messageType: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not ready, queuing subscription");
      return;
    }

    const message: ROSMessageBase = {
      op: "subscribe",
      topic: topic,
      type: messageType,
    };

    this.ws.send(JSON.stringify(message));
  }

  async getParam(name: string): Promise<any> {
    const response = await this.callService<{ name: string }, { value?: any }>(
      "/rosapi/get_param",
      "rosapi/GetParam",
      { name },
      10000,
    );

    if (response.value === undefined) {
      throw new Error(`Parameter ${name} not found`);
    }
    return response.value;
  }

  async callService<TReq extends object, TRes = any>(
    service: string,
    serviceType: string,
    args: TReq,
    timeoutMs: number = 5000,
  ): Promise<TRes> {
    if (!this.ws || !this.connected) {
      throw new Error(`Not connected to ROS — cannot call ${service}`);
    }

    return new Promise<TRes>((resolve, reject) => {
      const id = Math.random().toString(36).slice(2, 11);

      const timer = setTimeout(() => {
        this.removeAllListeners(`response:${id}`);
        reject(
          new Error(`Service call ${service} timed out after ${timeoutMs}ms`),
        );
      }, timeoutMs);

      this.once(`response:${id}`, (response: any) => {
        clearTimeout(timer);

        // rosbridge service_response shape:
        //   { op: 'service_response', id, service, values, result }
        // result is true on success, false on failure.
        if (response.result === false) {
          const msg =
            response.values?.message ?? `Service ${service} returned failure`;
          reject(new Error(msg));
          return;
        }

        resolve(response.values as TRes);
      });

      const request = {
        op: "call_service",
        id,
        service,
        type: serviceType,
        args,
      };

      try {
        this.ws!.send(JSON.stringify(request));
      } catch (err) {
        clearTimeout(timer);
        this.removeAllListeners(`response:${id}`);
        reject(err);
      }
    });
  }

  subscribe<T>(
    topic: string,
    messageType: string,
    callback: ROSCallback<T>,
  ): () => void {
    console.log(`Subscribing to ${topic} (${messageType})`);

    const subscription = this.subscriptions.get(topic);
    if (subscription) {
      subscription.callbacks.push(callback as ROSCallback<unknown>);
    } else {
      this.subscriptions.set(topic, {
        messageType,
        callbacks: [callback as ROSCallback<unknown>],
      });
      if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
        this.sendSubscription(topic, messageType);
      }
    }

    return () => {
      const sub = this.subscriptions.get(topic);
      if (sub) {
        sub.callbacks = sub.callbacks.filter((cb) => cb !== callback);
        if (sub.callbacks.length === 0) {
          this.subscriptions.delete(topic);
          if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(
              JSON.stringify({
                op: "unsubscribe",
                topic: topic,
              }),
            );
          }
        }
      }
    };
  }

  publish<T>(topic: string, messageType: string, message: T): boolean {
    if (!this.ws || !this.connected) return false;

    const rosMessage: ROSMessage = {
      op: "publish",
      topic: topic,
      type: messageType,
      msg: message as unknown as ROSMessageData,
    };

    try {
      this.ws.send(JSON.stringify(rosMessage));
      return true;
    } catch (error) {
      console.error("Error publishing message:", error);
      return false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.url) return;
    const base = Math.min(
      this.RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt),
      this.RECONNECT_MAX_MS
    );
    const jitter = base * 0.2 * (Math.random() * 2 - 1); // ±20%
    const delay = Math.round(base + jitter);
    this.reconnectAttempt++;
    console.log(`Reconnecting to ROSBridge in ${delay}ms (attempt ${this.reconnectAttempt})...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.connected) {
        this.connect(this.url).catch(() => {
          // onclose will schedule the next attempt
        });
      }
    }, delay);
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
    }
    this.subscriptions.clear();
    this.connected = false;
  }
}

const rosbridge = new ROSBridge();
export default rosbridge;
