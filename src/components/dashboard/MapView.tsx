'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

const MapContent = dynamic(
  () => import('./MapContent'),
  { ssr: false }
);

const MapView = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="h-full bg-[#1e1e1e] rounded-sm p-2 border border-[#333333] flex flex-col">
      <div className="flex items-center justify-between h-6 mb-1">
        <span className="text-[#00a5ff] text-sm font-semibold">Map View</span>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 relative rounded-sm overflow-hidden">
        {isClient && <MapContent />}
      </div>
    </div>
  );
};

export default MapView;