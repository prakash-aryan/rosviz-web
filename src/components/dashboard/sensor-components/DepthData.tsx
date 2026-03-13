'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Ruler, ArrowDown, TrendingUp, Focus, Maximize2 } from 'lucide-react';
import { useROS } from '@/hooks/useROS';

interface DepthPoint {
  timestamp: number;
  depth: number;
  minDepth: number;
  maxDepth: number;
}

interface DepthStats {
  currentDepth: number;
  maxDepth: number;
  minDepth: number;
  averageDepth: number;
  rateOfChange: number;
  validReadings: number;
  totalReadings: number;
}

interface LaserScan {
  header: {
    seq: number;
    stamp: { secs: number; nsecs: number };
    frame_id: string;
  };
  angle_min: number;
  angle_max: number;
  angle_increment: number;
  time_increment: number;
  scan_time: number;
  range_min: number;
  range_max: number;
  ranges: number[];
  intensities: number[];
}

const DepthData = () => {
  const [depthData, setDepthData] = useState<DepthPoint[]>([]);
  const [stats, setStats] = useState<DepthStats>({
    currentDepth: 0,
    maxDepth: 0,
    minDepth: Infinity,
    averageDepth: 0,
    rateOfChange: 0,
    validReadings: 0,
    totalReadings: 0
  });
  const prevDepthRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  const { subscribe } = useROS({
    url: 'ws://localhost:9090'
  });

  useEffect(() => {
    const processLaserScan = (message: LaserScan) => {
      // Filter out invalid readings based on range limits
      const validRanges = message.ranges.filter(range => 
        isFinite(range) && 
        range >= message.range_min && 
        range <= message.range_max
      );

      if (validRanges.length === 0) return null;

      // Calculate average depth and range bounds
      const avgDepth = validRanges.reduce((a, b) => a + b, 0) / validRanges.length;
      const minDepth = Math.min(...validRanges);
      const maxDepth = Math.max(...validRanges);

      return {
        depth: avgDepth,
        min: minDepth,
        max: maxDepth,
        valid: validRanges.length,
        total: message.ranges.length
      };
    };

    const handleScan = (message: LaserScan) => {
      const scanData = processLaserScan(message);
      if (!scanData) return;

      const now = Date.now();
      const timeDiff = (now - lastUpdateTimeRef.current) / 1000; // Convert to seconds
      const depthChange = scanData.depth - prevDepthRef.current;
      const rateOfChange = timeDiff > 0 ? depthChange / timeDiff : 0;

      // Update depth history
      setDepthData(prev => {
        const newPoint = {
          timestamp: now,
          depth: scanData.depth,
          minDepth: scanData.min,
          maxDepth: scanData.max
        };
        const newData = [...prev, newPoint].slice(-50); // Keep last 50 points
        return newData;
      });

      // Update statistics
      setStats(prev => ({
        currentDepth: scanData.depth,
        maxDepth: Math.max(prev.maxDepth, scanData.max),
        minDepth: Math.min(prev.minDepth, scanData.min),
        averageDepth: prev.averageDepth * 0.9 + scanData.depth * 0.1, // Moving average
        rateOfChange: Math.abs(rateOfChange) < 5 ? rateOfChange : prev.rateOfChange, // Filter spikes
        validReadings: scanData.valid,
        totalReadings: scanData.total
      }));

      prevDepthRef.current = scanData.depth;
      lastUpdateTimeRef.current = now;
    };

    const unsubscribe = subscribe('/scan', 'sensor_msgs/LaserScan', handleScan);
    return () => unsubscribe();
  }, [subscribe]);

  return (
    <div className="w-full h-full bg-[#2a2a2a] rounded-sm p-3 flex flex-col gap-3">
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1e1e1e] rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Current Depth</span>
              <span className="text-lg font-bold text-cyan-400">
                {stats.currentDepth.toFixed(3)} m
              </span>
            </div>
          </div>
          <div className="text-[10px] text-gray-500">
            {stats.validReadings}/{stats.totalReadings} points
          </div>
        </div>

        <div className="bg-[#1e1e1e] rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Rate of Change</span>
              <span className="text-lg font-bold text-emerald-400">
                {stats.rateOfChange > 0 ? '+' : ''}{stats.rateOfChange.toFixed(3)} m/s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Min/Max Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1e1e1e] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDown className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Maximum Depth</span>
          </div>
          <span className="text-lg font-bold text-blue-400">
            {stats.maxDepth.toFixed(3)} m
          </span>
        </div>

        <div className="bg-[#1e1e1e] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Focus className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-gray-400">Average Depth</span>
          </div>
          <span className="text-lg font-bold text-indigo-400">
            {stats.averageDepth.toFixed(3)} m
          </span>
        </div>
      </div>

      {/* Depth Graph */}
      <div className="flex-1 bg-[#1e1e1e] rounded-lg p-3 overflow-hidden flex flex-col min-h-[200px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Real-time Depth Measurements</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Points: {depthData.length}</span>
            <Maximize2 className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-300" />
          </div>
        </div>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={depthData}
              margin={{ top: 10, right: 10, bottom: 20, left: 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                stroke="#666666"
                tick={{ fontSize: 10 }}
                height={35}
              />
              <YAxis 
                domain={[0, 10]}
                stroke="#666666"
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `${value.toFixed(1)}m`}
                width={35}
              />
              {/* Range bands */}
              <Line
                type="monotone"
                dataKey="minDepth"
                stroke="#06b6d4"
                dot={false}
                strokeWidth={1}
                strokeOpacity={0.3}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="maxDepth"
                stroke="#06b6d4"
                dot={false}
                strokeWidth={1}
                strokeOpacity={0.3}
                isAnimationActive={false}
              />
              {/* Main depth line */}
              <Line
                type="monotone"
                dataKey="depth"
                stroke="#06b6d4"
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

export default DepthData;