'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronRight } from 'lucide-react';
import Split from 'split.js';
import dynamic from 'next/dynamic';

const RobotModel = dynamic(
  () => import('./sensor-components/RobotModel'),
  {
    loading: () => (
      <div className="h-full bg-[#1e1e1e] rounded-sm flex items-center justify-center">
        <span className="text-gray-400">Loading Robot Model...</span>
      </div>
    ),
    ssr: false
  }
);

const DepthData = dynamic(
  () => import('./sensor-components/DepthData'),
  {
    loading: () => (
      <div className="h-full bg-[#1e1e1e] rounded-sm flex items-center justify-center">
        <span className="text-gray-400">Loading Depth Data...</span>
      </div>
    ),
    ssr: false
  }
);

const VideoFeed = dynamic(
  () => import('./sensor-components/VideoFeed'),
  {
    loading: () => (
      <div className="h-full bg-[#1e1e1e] rounded-sm flex items-center justify-center">
        <span className="text-gray-400">Loading Video Feed...</span>
      </div>
    ),
    ssr: false
  }
);

const PointCloud = dynamic(
  () => import('./sensor-components/PointCloud'),
  {
    loading: () => (
      <div className="h-full bg-[#1e1e1e] rounded-sm flex items-center justify-center">
        <span className="text-gray-400">Loading Point Cloud...</span>
      </div>
    ),
    ssr: false
  }
);

const BatteryStats = dynamic(
  () => import('./sensor-components/BatteryStats'),
  {
    loading: () => (
      <div className="h-full bg-[#1e1e1e] rounded-sm flex items-center justify-center">
        <span className="text-gray-400">Loading Battery Stats...</span>
      </div>
    ),
    ssr: false
  }
);

const SensorData = () => {
  const containerRef = useRef(null);
  const col1Ref = useRef(null);
  const col3Ref = useRef(null);
  const [shouldRenderModel, setShouldRenderModel] = useState(false);
  const [shouldRenderPointCloud, setShouldRenderPointCloud] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Set initial render state immediately
    setShouldRenderModel(true);
    setShouldRenderPointCloud(true);
    
    // Short delay before enabling Split.js
    const timer = setTimeout(() => {
      setInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let mainSplit: Split.Instance;
    let col1Split: Split.Instance;
    let col3Split: Split.Instance;

    if (initialized && containerRef.current) {
      // Initialize main horizontal split (three columns)
      mainSplit = Split(['.col-1', '.col-2', '.col-3'], {
        sizes: [30, 40, 30],
        minSize: [200, 300, 200],
        gutterSize: 4,
        snapOffset: 0,
        dragInterval: 1,
        cursor: 'col-resize',
        gutter: (index, direction) => {
          const gutter = document.createElement('div');
          gutter.className = `gutter gutter-${direction} bg-[#232323] hover:bg-[#00a5ff] transition-colors duration-150`;
          return gutter;
        },
      });

      // Initialize column 1 vertical split
      col1Split = Split(['.col-1-top', '.col-1-bottom'], {
        sizes: [50, 50],
        minSize: [150, 150],
        direction: 'vertical',
        gutterSize: 4,
        snapOffset: 0,
        cursor: 'row-resize',
        gutter: (index, direction) => {
          const gutter = document.createElement('div');
          gutter.className = `gutter gutter-${direction} bg-[#232323] hover:bg-[#00a5ff] transition-colors duration-150`;
          return gutter;
        },
      });

      // Initialize column 3 vertical split
      col3Split = Split(['.col-3-top', '.col-3-bottom'], {
        sizes: [50, 50],
        minSize: [150, 150],
        direction: 'vertical',
        gutterSize: 4,
        snapOffset: 0,
        cursor: 'row-resize',
        gutter: (index, direction) => {
          const gutter = document.createElement('div');
          gutter.className = `gutter gutter-${direction} bg-[#232323] hover:bg-[#00a5ff] transition-colors duration-150`;
          return gutter;
        },
      });
    }

    return () => {
      mainSplit?.destroy();
      col1Split?.destroy();
      col3Split?.destroy();
    };
  }, [initialized]);

  return (
    <div className="h-[calc(100vh-3rem)] p-4 bg-[#1a1a1a]" ref={containerRef}>
      <div className="flex h-full gap-1">
        {/* Column 1 */}
        <div className="col-1 flex flex-col w-[30%]" ref={col1Ref}>
          <div className="col-1-top h-[50%]">
            <div className="h-full bg-[#1e1e1e] rounded-sm p-2 border border-[#333333]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#00a5ff] text-sm font-semibold">Robot Model</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-[calc(100%-2rem)]">
                {shouldRenderModel && <RobotModel />}
              </div>
            </div>
          </div>
          <div className="col-1-bottom h-[50%]">
            <div className="h-full bg-[#1e1e1e] rounded-sm p-2 border border-[#333333]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#00a5ff] text-sm font-semibold">Depth Data</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-[calc(100%-2rem)]">
                <DepthData />
              </div>
            </div>
          </div>
        </div>

        {/* Column 2 */}
        <div className="col-2 w-[40%]">
          <div className="h-full bg-[#1e1e1e] rounded-sm p-2 border border-[#333333]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#00a5ff] text-sm font-semibold">Video Feed</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="h-[calc(100%-2rem)]">
              <VideoFeed />
            </div>
          </div>
        </div>

        {/* Column 3 */}
        <div className="col-3 flex flex-col w-[30%]" ref={col3Ref}>
          <div className="col-3-top h-[50%]">
            <div className="h-full bg-[#1e1e1e] rounded-sm p-2 border border-[#333333]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#00a5ff] text-sm font-semibold">Point Cloud</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-[calc(100%-2rem)]">
                {shouldRenderPointCloud && <PointCloud />}
              </div>
            </div>
          </div>
          <div className="col-3-bottom h-[50%]">
            <div className="h-full bg-[#1e1e1e] rounded-sm p-2 border border-[#333333]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#00a5ff] text-sm font-semibold">Battery Statistics</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-[calc(100%-2rem)]">
                <BatteryStats />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorData;