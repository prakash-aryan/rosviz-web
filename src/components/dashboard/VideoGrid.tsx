'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import VideoStream from './VideoStream';

interface ViewProps {
  index: number;
  topic: string;
  label: string;
  isMaximized: boolean;
  onMaximize: (index: number) => void;
  onMinimize: () => void;
}

const View: React.FC<ViewProps> = ({ index, topic, label, isMaximized, onMaximize, onMinimize }) => {
  return (
    <div 
      className={`bg-black rounded-sm overflow-hidden ${
        isMaximized ? 'fixed top-0 left-0 w-full h-full z-50' : 'h-full'
      }`}
      onDoubleClick={() => !isMaximized && onMaximize(index)}
    >
      <div className="w-full h-6 bg-[#2a2a2a] px-2 flex items-center justify-between">
        <span className="text-gray-400 text-xs">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Live</span>
          {isMaximized ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 text-gray-400 hover:text-white"
              onClick={onMinimize}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 text-gray-400 hover:text-white"
              onClick={() => onMaximize(index)}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <div className="w-full h-[calc(100%-1.5rem)]">
        <VideoStream topic={topic} />
      </div>
    </div>
  );
};

const VideoGrid = () => {
  const [isMounted, setIsMounted] = React.useState(false);
  const [maximizedView, setMaximizedView] = React.useState<number | null>(null);

  const views = [
    { topic: '/camera/image_raw', label: 'RGB Camera 1' },
    { topic: '/camera/image_raw', label: 'RGB Camera 2' },
    { topic: '/camera/image_raw', label: 'RGB Camera 3' },
    { topic: '/camera/image_raw', label: 'RGB Camera 4' },
    { topic: '/camera/image_raw', label: 'RGB Camera 5' },
    { topic: '/camera/image_raw', label: 'RGB Camera 6' }
  ];

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMaximize = (index: number) => {
    setMaximizedView(index);
  };

  const handleMinimize = () => {
    setMaximizedView(null);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="h-full bg-[#1e1e1e] rounded-sm p-2 border border-[#333333]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#00a5ff] text-sm font-semibold">Camera Views</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className={`${
        maximizedView !== null ? '' : 'grid grid-cols-3 grid-rows-2 gap-2'
      } h-[calc(100%-2rem)]`}>
        {views.map((view, index) => (
          maximizedView === null || maximizedView === index ? (
            <View
              key={index}
              index={index}
              topic={view.topic}
              label={view.label}
              isMaximized={maximizedView === index}
              onMaximize={handleMaximize}
              onMinimize={handleMinimize}
            />
          ) : null
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;