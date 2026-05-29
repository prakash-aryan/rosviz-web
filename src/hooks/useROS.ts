import { useState, useEffect, useCallback } from "react";
import rosbridge from "@/lib/rosbridge";
import type { ROSCallback } from "@/types/ros";

interface UseROSOptions {
  url?: string;
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

/**
 * Prefix a topic with the robot namespace if a robotId is provided.
 * Returns the topic unchanged when robotId is undefined — this matters
 * for shared topics like /tf and mux outputs (/selected/*).
 */
function resolveTopic(topic: string, robotId?: number): string {
  if (robotId === undefined) return topic;
  return `/tb3_${robotId}${topic}`;
}

export function useROS(options: UseROSOptions = {}) {
  const {
    url = "ws://localhost:9090",
    autoConnect = true,
    onConnected,
    onDisconnected,
  } = options;

  const [isConnected, setIsConnected] = useState(rosbridge.isConnected());
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    console.log("useROS hook init:", {
      isConnected,
      isConnecting,
      autoConnect,
    });

    const handleConnect = () => {
      console.log("ROS connection established");
      setIsConnected(true);
      setIsConnecting(false);
      onConnected?.();
    };

    const handleDisconnect = () => {
      console.log("ROS connection lost");
      setIsConnected(false);
      setIsConnecting(false);
      onDisconnected?.();
    };

    rosbridge.on("connected", handleConnect);
    rosbridge.on("disconnected", handleDisconnect);

    if (autoConnect && !rosbridge.isConnected() && !isConnecting) {
      setIsConnecting(true);
      console.log("Attempting to connect to ROS...");
      rosbridge.connect(url).catch((error) => {
        console.warn("ROS connection unavailable:", error);
        setIsConnecting(false);
      });
    }

    return () => {
      rosbridge.off("connected", handleConnect);
      rosbridge.off("disconnected", handleDisconnect);
    };
  }, [url, autoConnect, onConnected, onDisconnected]);

  /**
   * Subscribe to a topic.
   *
   * @param topic      Topic path (e.g. '/odom', '/tf', '/selected/scan_points').
   * @param messageType ROS message type string.
   * @param callback   Called with each incoming message.
   * @param robotId    Optional — when provided, topic is prefixed /tb3_<robotId>.
   *                   Omit for shared topics like /tf and /selected/*.
   * @returns Unsubscribe function.
   */
  const subscribe = useCallback(
    <T>(
      topic: string,
      messageType: string,
      callback: ROSCallback<T>,
      robotId?: number,
    ): (() => void) => {
      const fullTopic = resolveTopic(topic, robotId);
      return rosbridge.subscribe<T>(fullTopic, messageType, callback);
    },
    [],
  );

  /**
   * Publish a message to a topic.
   *
   * @param topic       Topic path.
   * @param messageType ROS message type string.
   * @param message     The message object.
   * @param robotId     Optional — when provided, topic is prefixed /tb3_<robotId>.
   * @returns true if sent, false if not connected.
   */
  const publish = useCallback(
    <T>(
      topic: string,
      messageType: string,
      message: T,
      robotId?: number,
    ): boolean => {
      const fullTopic = resolveTopic(topic, robotId);
      return rosbridge.publish<T>(fullTopic, messageType, message);
    },
    [],
  );

  return {
    isConnected,
    isConnecting,
    subscribe,
    publish,
    connect: useCallback(() => rosbridge.connect(url), [url]),
    disconnect: useCallback(() => rosbridge.disconnect(), []),
  };
}

export default useROS;
