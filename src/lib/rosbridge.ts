import { EventEmitter } from 'events';
import type { ROSMessage, ROSCallback, ROSMessageData, ROSMessageBase } from '@/types/ros';

class ROSBridge extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string = '';
  private connected: boolean = false;
  private subscriptions: Map<string, { messageType: string; callbacks: ROSCallback<unknown>[] }> = new Map();
  private connectPromise: Promise<void> | null = null;

  async connect(url: string = 'ws://localhost:9090'): Promise<void> {
    if (this.connected) return;
    if (this.connectPromise) return this.connectPromise;

    this.url = url;
    this.connectPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('Connected to ROSBridge server');
          this.connected = true;
          this.emit('connected');
          this.resubscribeAll();
          this.connectPromise = null;
          resolve();
        };

        this.ws.onclose = () => {
          console.log('Disconnected from ROSBridge server');
          this.connected = false;
          this.emit('disconnected');
          this.connectPromise = null;
        };

        this.ws.onerror = (error) => {
          console.error('ROSBridge WebSocket error:', error);
          if (!this.connected) {
            this.connectPromise = null;
            reject(error);
          }
        };

        this.ws.onmessage = this.handleMessage.bind(this);

      } catch (error) {
        console.error('Error connecting to ROSBridge:', error);
        this.connectPromise = null;
        reject(error);
      }
    });

    return this.connectPromise;
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.op === 'service_response') {
        this.emit(`response:${data.id}`, data);
        return;
      }

      if (data.op === 'param_response') {
        this.emit(`response:${data.id}`, data);
        return;
      }

      if (data.op === 'publish' && data.topic && data.msg) {
        const subscription = this.subscriptions.get(data.topic);
        if (subscription) {
          const msg = data.msg as ROSMessageData;
          if (msg.data && typeof msg.data === 'string') {
            const binaryData = this.base64ToUint8Array(msg.data);
            msg.data = binaryData;
          }
          subscription.callbacks.forEach(callback => callback(msg));
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      console.error('Error converting base64 to Uint8Array:', error);
      throw error;
    }
  }

  private resubscribeAll() {
    console.log('Resubscribing to all topics...');
    for (const [topic, { messageType }] of this.subscriptions) {
      this.sendSubscription(topic, messageType);
    }
  }

  private sendSubscription(topic: string, messageType: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not ready, queuing subscription');
      return;
    }

    const message: ROSMessageBase = {
      op: 'subscribe',
      topic: topic,
      type: messageType
    };

    this.ws.send(JSON.stringify(message));
  }

  async getParam(name: string): Promise<any> {
    if (!this.ws || !this.connected) {
      throw new Error('Not connected to ROS');
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substr(2, 9);
      const timeoutId = setTimeout(() => {
        this.removeAllListeners(`response:${id}`);
        reject(new Error('Parameter request timed out'));
      }, 10000);

      this.once(`response:${id}`, (response: any) => {
        clearTimeout(timeoutId);
        console.log('Parameter response:', response);

        if (response.op === 'service_response') {
          if (response.values && response.values.value) {
            resolve(response.values.value);
          } else {
            reject(new Error('Parameter not found'));
          }
        } else if (response.op === 'param_response') {
          if (response.value !== undefined) {
            resolve(response.value);
          } else {
            reject(new Error('Parameter not found'));
          }
        } else {
          reject(new Error('Invalid response format'));
        }
      });

      const request = {
        op: 'call_service',
        id: id,
        service: '/rosapi/get_param',
        args: { name: name }
      };

      if (this.ws) {
        this.ws.send(JSON.stringify(request));
        console.log('Parameter request sent:', request);
      } else {
        clearTimeout(timeoutId);
        reject(new Error('WebSocket not available'));
      }
    });
  }

  subscribe<T>(topic: string, messageType: string, callback: ROSCallback<T>): () => void {
    console.log(`Subscribing to ${topic} (${messageType})`);
    
    const subscription = this.subscriptions.get(topic);
    if (subscription) {
      subscription.callbacks.push(callback as ROSCallback<unknown>);
    } else {
      this.subscriptions.set(topic, {
        messageType,
        callbacks: [callback as ROSCallback<unknown>]
      });
      if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
        this.sendSubscription(topic, messageType);
      }
    }

    return () => {
      const sub = this.subscriptions.get(topic);
      if (sub) {
        sub.callbacks = sub.callbacks.filter(cb => cb !== callback);
        if (sub.callbacks.length === 0) {
          this.subscriptions.delete(topic);
          if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              op: 'unsubscribe',
              topic: topic
            }));
          }
        }
      }
    };
  }

  publish<T>(topic: string, messageType: string, message: T): boolean {
    if (!this.ws || !this.connected) return false;

    const rosMessage: ROSMessage = {
      op: 'publish',
      topic: topic,
      type: messageType,
      msg: message as unknown as ROSMessageData
    };

    try {
      this.ws.send(JSON.stringify(rosMessage));
      return true;
    } catch (error) {
      console.error('Error publishing message:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.subscriptions.clear();
    this.connected = false;
  }
}

const rosbridge = new ROSBridge();
export default rosbridge;