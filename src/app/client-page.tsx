'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const DashboardClient = dynamic(
  () => import('@/components/dashboard/DashboardClient'),
  { 
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center bg-[#1a1a1a] text-gray-400">
        Loading...
      </div>
    ),
    ssr: false
  }
);

export default function ClientPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-[#1a1a1a] text-gray-400">
        Loading...
      </div>
    }>
      <DashboardClient />
    </Suspense>
  );
}