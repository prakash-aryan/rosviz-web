'use client';

import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useROS } from '@/hooks/useROS';

interface VoltageData {
  timestamp: number;
  voltage: number;
}

interface BatteryStateMessage {
  voltage: number;
  percentage: number;
  current: number;
  charge: number;
  capacity: number;
  design_capacity: number;
  power_supply_status: number;
  power_supply_health: number;
  power_supply_technology: number;
  present: boolean;
}

const BatteryStats = () => {
  const [voltage, setVoltage] = useState<number | null>(null);
  const [voltageHistory, setVoltageHistory] = useState<VoltageData[]>([]);
  const { subscribe } = useROS({ url: 'ws://localhost:9090' });

  useEffect(() => {
    const handleBattery = (message: BatteryStateMessage) => {
      if (message.voltage !== undefined) {
        const newVoltage = message.voltage;
        const now = Date.now();

        setVoltage(newVoltage);
        setVoltageHistory(prev => {
          const newPoint = { timestamp: now, voltage: newVoltage };
          return [...prev.slice(-50), newPoint];
        });
      }
    };

    const unsubscribe = subscribe('/battery_state', 'sensor_msgs/BatteryState', handleBattery);
    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="w-full h-full bg-[#2a2a2a] rounded-sm p-3 flex flex-col gap-3">
      {/* Main Stats */}
      <div className="bg-[#1e1e1e] rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-gray-400">Voltage</span>
        </div>
        <span className="text-lg font-bold text-yellow-400">
          {voltage !== null ? voltage.toFixed(1) : '--'} V
        </span>
      </div>

      {/* Voltage Graph */}
      <div className="flex-1 bg-[#1e1e1e] rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2">Voltage Over Time</div>
        <div className="w-full h-[calc(100%-24px)]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={voltageHistory}
              margin={{ top: 5, right: 5, bottom: 20, left: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatTimestamp}
                stroke="#666666"
                tick={{ fontSize: 10 }}
                height={35}
              />
              <YAxis
                stroke="#666666"
                tick={{ fontSize: 10 }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `${value.toFixed(1)}V`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #333333',
                  borderRadius: '4px'
                }}
                labelFormatter={formatTimestamp}
                formatter={(value: number) => [`${value.toFixed(1)}V`, 'Voltage']}
              />
              <Line
                type="monotone"
                dataKey="voltage"
                stroke="#facc15"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default BatteryStats;