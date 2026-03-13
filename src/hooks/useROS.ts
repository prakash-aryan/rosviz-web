import { useState, useEffect, useCallback } from 'react';
import rosbridge from '@/lib/rosbridge';
import type { ROSCallback } from '@/types/ros';

interface UseROSOptions {
  url?: string;
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useROS(options: UseROSOptions = {}) {
  const {
    url = 'ws://localhost:9090',
    autoConnect = true,
    onConnected,
    onDisconnected
  } = options;

  const [isConnected, setIsConnected] = useState(rosbridge.isConnected());
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    console.log('useROS hook init:', { isConnected, isConnecting, autoConnect });
    
    const handleConnect = () => {
      console.log('ROS connection established');
      setIsConnected(true);
      setIsConnecting(false);
      onConnected?.();
    };

    const handleDisconnect = () => {
      console.log('ROS connection lost');
      setIsConnected(false);
      setIsConnecting(false);
      onDisconnected?.();
    };

    rosbridge.on('connected', handleConnect);
    rosbridge.on('disconnected', handleDisconnect);

    if (autoConnect && !isConnected && !isConnecting) {
      setIsConnecting(true);
      console.log('Attempting to connect to ROS...');
      rosbridge.connect(url)
        .catch(error => {
          console.error('ROS connection error:', error);
          setIsConnecting(false);
        });
    }

    return () => {
      rosbridge.off('connected', handleConnect);
      rosbridge.off('disconnected', handleDisconnect);
    };
  }, [url, autoConnect, onConnected, onDisconnected]);

  const subscribe = useCallback(<T>(
    topic: string,
    messageType: string,
    callback: ROSCallback<T>
  ): (() => void) => {
    console.log(`Subscribing to ${topic} (${messageType})`);
    return rosbridge.subscribe<T>(topic, messageType, callback);
  }, []);

  const publish = useCallback(<T>(
    topic: string,
    messageType: string,
    message: T
  ): boolean => {
    return rosbridge.publish<T>(topic, messageType, message);
  }, []);

  return {
    isConnected,
    isConnecting,
    subscribe,
    publish,
    connect: useCallback(() => rosbridge.connect(url), [url]),
    disconnect: useCallback(() => rosbridge.disconnect(), [])
  };
}

export default useROS;