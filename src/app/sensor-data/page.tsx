'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const SensorData = dynamic(
  () => import('@/components/dashboard/SensorData'),
  { 
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center bg-[#1a1a1a] text-gray-400">
        Loading Sensor Data...
      </div>
    ),
    ssr: false
  }
);

export default function SensorDataPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-[#1a1a1a] text-gray-400">
        Loading...
      </div>
    }>
      <SensorData />
    </Suspense>
  );
}