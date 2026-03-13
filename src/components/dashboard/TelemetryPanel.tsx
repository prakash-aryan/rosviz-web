'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronRight } from 'lucide-react';
import { useROS } from '@/hooks/useROS';
import * as THREE from 'three';

interface TelemetryData {
  label: string;
  value: string;
  unit: string;
  min: number;
  max: number;
  color?: string;
  precision?: number;
  topicInfo: {
    topic: string;
    messageType: string;
    field: string;
  };
}

type UnsubscribeFn = () => void;

interface IMUMessage {
  orientation: { x: number; y: number; z: number; w: number };
  angular_velocity: { x: number; y: number; z: number };
  linear_acceleration: { x: number; y: number; z: number };
}

interface OdometryMessage {
  pose: {
    pose: {
      position: { x: number; y: number; z: number };
      orientation: { x: number; y: number; z: number; w: number };
    };
  };
  twist: {
    twist: {
      linear: { x: number; y: number; z: number };
      angular: { x: number; y: number; z: number };
    };
  };
}

interface RangeMessage {
  range: number;
  min_range: number;
  max_range: number;
}

const TelemetryPanel = () => {
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([
    {
      label: 'Position X',
      value: '0.0',
      unit: 'm',
      min: -10,
      max: 10,
      color: '#22c55e',
      precision: 2,
      topicInfo: {
        topic: '/odom',
        messageType: 'nav_msgs/Odometry',
        field: 'pose.pose.position.x'
      }
    },
    {
      label: 'Position Y',
      value: '0.0',
      unit: 'm',
      min: -10,
      max: 10,
      color: '#f59e0b',
      precision: 2,
      topicInfo: {
        topic: '/odom',
        messageType: 'nav_msgs/Odometry',
        field: 'pose.pose.position.y'
      }
    },
    {
      label: 'Position Z',
      value: '0.0',
      unit: 'm',
      min: -10,
      max: 10,
      color: '#3b82f6',
      precision: 2,
      topicInfo: {
        topic: '/odom',
        messageType: 'nav_msgs/Odometry',
        field: 'pose.pose.position.z'
      }
    },
    {
      label: 'Yaw',
      value: '0.0',
      unit: '°',
      min: -180,
      max: 180,
      color: '#8b5cf6',
      precision: 1,
      topicInfo: {
        topic: '/odom',
        messageType: 'nav_msgs/Odometry',
        field: 'pose.pose.orientation'
      }
    },
    {
      label: 'Roll',
      value: '0.0',
      unit: '°',
      min: -180,
      max: 180,
      color: '#10b981',
      precision: 1,
      topicInfo: {
        topic: '/imu',
        messageType: 'sensor_msgs/Imu',
        field: 'orientation'
      }
    },
    {
      label: 'Pitch',
      value: '0.0',
      unit: '°',
      min: -90,
      max: 90,
      color: '#f97316',
      precision: 1,
      topicInfo: {
        topic: '/imu',
        messageType: 'sensor_msgs/Imu',
        field: 'orientation'
      }
    },
    {
      label: 'Linear Vel X',
      value: '0.0',
      unit: 'm/s',
      min: -10,
      max: 10,
      color: '#60a5fa',
      precision: 2,
      topicInfo: {
        topic: '/odom',
        messageType: 'nav_msgs/Odometry',
        field: 'twist.twist.linear.x'
      }
    },
    {
      label: 'Linear Vel Y',
      value: '0.0',
      unit: 'm/s',
      min: -10,
      max: 10,
      color: '#f59e0b',
      precision: 2,
      topicInfo: {
        topic: '/odom',
        messageType: 'nav_msgs/Odometry',
        field: 'twist.twist.linear.y'
      }
    },
    {
      label: 'Linear Vel Z',
      value: '0.0',
      unit: 'm/s',
      min: -10,
      max: 10,
      color: '#3b82f6',
      precision: 2,
      topicInfo: {
        topic: '/odom',
        messageType: 'nav_msgs/Odometry',
        field: 'twist.twist.linear.z'
      }
    },
    {
      label: 'Angular Vel',
      value: '0.0',
      unit: 'rad/s',
      min: -5,
      max: 5,
      color: '#60a5fa',
      precision: 2,
      topicInfo: {
        topic: '/imu',
        messageType: 'sensor_msgs/Imu',
        field: 'angular_velocity.z'
      }
    },
    {
      label: 'Height',
      value: '0.0',
      unit: 'm',
      min: 0,
      max: 10,
      color: '#22c55e',
      precision: 2,
      topicInfo: {
        topic: '/odom',
        messageType: 'nav_msgs/Odometry',
        field: 'pose.pose.position.z'
      }
    },
    {
      label: 'Status',
      value: 'Idle',
      unit: '',
      min: 0,
      max: 5,
      color: '#22c55e',
      topicInfo: {
        topic: '/odom',
        messageType: 'nav_msgs/Odometry',
        field: 'status'
      }
    }
  ]);

  const subscriptionsRef = useRef<UnsubscribeFn[]>([]);
  const isSubscribedRef = useRef(false);

  const { isConnected, subscribe } = useROS({
    url: 'ws://localhost:9090',
    autoConnect: true
  });

  const updateTelemetryValue = useCallback((label: string, value: number | string) => {
    setTelemetryData(prev => prev.map(data => {
      if (data.label === label) {
        if (typeof value === 'number' && data.precision !== undefined) {
          return { ...data, value: value.toFixed(data.precision) };
        }
        return { ...data, value: String(value) };
      }
      return data;
    }));
  }, []);

  const handleIMUUpdate = useCallback((message: IMUMessage) => {
    const quaternion = new THREE.Quaternion(
      message.orientation.x,
      message.orientation.y,
      message.orientation.z,
      message.orientation.w
    );
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    
    updateTelemetryValue('Roll', euler.x * 180 / Math.PI);
    updateTelemetryValue('Pitch', euler.y * 180 / Math.PI);
    updateTelemetryValue('Angular Vel', message.angular_velocity.z);
  }, [updateTelemetryValue]);

  const handleOdometryUpdate = useCallback((message: OdometryMessage) => {
    updateTelemetryValue('Position X', message.pose.pose.position.x);
    updateTelemetryValue('Position Y', message.pose.pose.position.y);
    updateTelemetryValue('Position Z', message.pose.pose.position.z);

    const quaternion = new THREE.Quaternion(
      message.pose.pose.orientation.x,
      message.pose.pose.orientation.y,
      message.pose.pose.orientation.z,
      message.pose.pose.orientation.w
    );
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    updateTelemetryValue('Yaw', euler.z * 180 / Math.PI);

    updateTelemetryValue('Linear Vel X', message.twist.twist.linear.x);
    updateTelemetryValue('Linear Vel Y', message.twist.twist.linear.y);
    updateTelemetryValue('Linear Vel Z', message.twist.twist.linear.z);
  }, [updateTelemetryValue]);

  const handleSonarUpdate = useCallback((message: RangeMessage) => {
    updateTelemetryValue('Height', message.range);
  }, [updateTelemetryValue]);

  // Effect for connection status
  useEffect(() => {
    setTelemetryData(prev => prev.map(data => 
      data.label === 'Status' ? { ...data, value: isConnected ? 'Connected' : 'Disconnected' } : data
    ));
  }, [isConnected]);

  // Effect for subscriptions
  useEffect(() => {
    if (!isConnected || isSubscribedRef.current) return;

    // Store topic configurations to avoid dependency on telemetryData
    const topicConfigs = new Map([
      ['/odom', 'nav_msgs/Odometry'],
      ['/imu', 'sensor_msgs/Imu'],
    ]);

    // Clean up existing subscriptions
    subscriptionsRef.current.forEach(unsub => unsub());
    subscriptionsRef.current = [];

    // Create new subscriptions
    for (const [topic, messageType] of topicConfigs) {
      const handleMessage = (message: any) => {
        switch (topic) {
          case '/imu':
            handleIMUUpdate(message as IMUMessage);
            break;
          case '/odom':
            handleOdometryUpdate(message as OdometryMessage);
            break;
        }
      };

      const unsubscribe = subscribe(topic, messageType, handleMessage);
      subscriptionsRef.current.push(unsubscribe);
    }

    isSubscribedRef.current = true;

    return () => {
      subscriptionsRef.current.forEach(unsub => unsub());
      subscriptionsRef.current = [];
      isSubscribedRef.current = false;
    };
  }, [isConnected, subscribe, handleIMUUpdate, handleOdometryUpdate, handleSonarUpdate]);

  const getStatusColor = (data: TelemetryData): string => {
    if (data.label === 'Status') {
      return data.value === 'Connected' ? '#22c55e' : '#f59e0b';
    }
    if (data.label === 'Height' && parseFloat(data.value) < 0.5) {
      return '#ef4444';
    }
    return data.color || '#00a5ff';
  };

  const getProgressValue = (data: TelemetryData): number => {
    if (data.value === 'Idle' || data.value === 'Connected' || data.value === 'Disconnected') {
      return 0;
    }
    const value = parseFloat(data.value);
    if (isNaN(value)) return 0;
    return Math.min(100, Math.max(0, ((value - data.min) / (data.max - data.min)) * 100));
  };

  return (
    <div className="h-full bg-[#1a1a1a] rounded-sm p-2 border border-[#2a2a2a]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[#00a5ff] text-sm font-semibold">Telemetry Data</span>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">{isConnected ? 'Live' : 'Disconnected'}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-4 grid-rows-3 gap-2 h-[calc(100%-2rem)]">
        {telemetryData.map((data, index) => (
          <div 
            key={index} 
            className="bg-[#222222] rounded-lg p-2 flex flex-col justify-center border border-[#333333] hover:border-[#444444] transition-colors duration-200 overflow-hidden"
            style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-gray-400 text-xs font-medium truncate flex-1 mr-2">{data.label}</span>
              {data.max > 0 && !['Idle', 'Connected', 'Disconnected'].includes(data.value) && (
                <div 
                  className="h-1 w-8 rounded-full bg-[#333333] flex-shrink-0 overflow-hidden"
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${getProgressValue(data)}%`,
                      backgroundColor: getStatusColor(data)
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-0.5 min-w-0">
              <span 
                className="text-base font-bold tracking-tight truncate"
                style={{ color: getStatusColor(data) }}
              >
                {data.value}
              </span>
              {data.unit && (
                <span className="text-gray-500 text-xs flex-shrink-0">{data.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TelemetryPanel;