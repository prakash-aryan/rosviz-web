"use client";

import Link from "next/link";
import { Grid, Eye } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useDiscoveredRobots } from "@/hooks/useDiscoveredRobots";
import { useROS } from "@/hooks/useROS";

// const FleetMap = dynamic(() => import('@/components/dashboard/Fleet2DMap'), { ssr: false });
const MapView = dynamic(() => import("@/components/dashboard/MapView"), { ssr: false });
const PointCloud = dynamic(() => import("@/components/dashboard/sensor-components/PointCloud"), {
  ssr: false,
});
const AlertHistory = dynamic(() => import("@/components/dashboard/AlertHistory"), {
  ssr: false,
});

function getRobotColor(id: number): string {
  const hue = (id * 137.5) % 360;
  return `hsl(${hue}, 80%, 55%)`;
}

export default function CommonPage() {
  const { isConnected } = useROS();
  const robotIds = useDiscoveredRobots();
  const [coords, setCoords] = useState<Record<number, { lat: string; lon: string }>>({});

  useEffect(() => {
    setCoords((prev) => {
      const next = { ...prev };
      for (const id of robotIds) {
        if (!(id in next)) {
          next[id] = { lat: "", lon: "" };
        }
      }
      return next;
    });
  }, [robotIds]);

  const handleCoordChange = (id: number, field: "lat" | "lon", value: string) => {
    setCoords((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleMoveAll = () => {
    console.log("Move all robots to:", coords);
    // TODO: actually moving the robots!
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1a1a1a] flex flex-col">
      {/* Top Toolbar */}
      <div className="w-full min-h-12 bg-[#232323] flex flex-wrap sm:flex-nowrap items-center px-2 py-2 sm:py-0 gap-1 border-b border-[#333333] shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <Link href="/">
            <button className="h-8 px-3 text-sm flex items-center gap-2 rounded text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors whitespace-nowrap">
              <Grid className="w-4 h-4" />
              Fleet Overview
            </button>
          </Link>
          <Link href="/common">
            <button className="h-8 px-3 text-sm flex items-center gap-2 rounded text-white bg-[#2a2a2a] whitespace-nowrap">
              <Eye className="w-4 h-4" />
              Common
            </button>
          </Link>
        </div>
        <div className="flex-1" />
        <span className="hidden sm:inline text-gray-400 text-sm">TurtleBot3 Control System</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 p-3 sm:p-4 overflow-y-auto lg:overflow-hidden">
        {/* Top Row */}
        <div className="flex flex-col lg:flex-row gap-2 min-h-0 shrink-0 lg:shrink lg:flex-[3]">
          {/* 2D Map */}
          <div className="h-72 sm:h-80 lg:h-auto lg:flex-[2] min-w-0 min-h-0">
            <MapView />
          </div>

          {/* Point Cloud */}
          <div className="h-80 lg:h-auto lg:flex-[1.5] min-w-0 bg-[#1e1e1e] rounded-sm border border-[#333333] flex flex-col p-2">
            <span className="text-[#00a5ff] text-sm font-semibold mb-2 shrink-0">Point Cloud</span>
            <div className="flex-1 min-h-0">
              {isConnected ? (
                <PointCloud source="global" topic="/common/scan/points" />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                  Connecting to ROS...
                </div>
              )}
            </div>
          </div>

          {/* Common Controls */}
          <div className="w-full lg:w-96 lg:shrink-0 bg-[#1e1e1e] rounded-sm border border-[#333333] flex flex-col p-2 gap-2">
            <span className="text-[#00a5ff] text-sm font-semibold shrink-0">Common Controls</span>
            <div className="flex-1 flex flex-col gap-2">
              {robotIds.length === 0 ? (
                <div className="flex items-center justify-center flex-1 text-gray-500 text-xs">
                  Discovering robots...
                </div>
              ) : (
                robotIds.map((id) => (
                  <div key={id} className="grid grid-cols-[auto_3.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getRobotColor(id) }}
                    />
                    <span className="text-gray-400 text-xs w-16 shrink-0">TB3-{id}</span>
                    <input
                      type="text"
                      placeholder="Lat"
                      value={coords[id]?.lat ?? ""}
                      onChange={(e) => handleCoordChange(id, "lat", e.target.value)}
                      className="w-full min-w-0 h-7 bg-[#2a2a2a] border border-[#333333] rounded px-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#00a5ff]"
                    />
                    <input
                      type="text"
                      placeholder="Lon"
                      value={coords[id]?.lon ?? ""}
                      onChange={(e) => handleCoordChange(id, "lon", e.target.value)}
                      className="w-full min-w-0 h-7 bg-[#2a2a2a] border border-[#333333] rounded px-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#00a5ff]"
                    />
                  </div>
                ))
              )}
            </div>
            <button
              onClick={handleMoveAll}
              className="w-full h-8 bg-[#00a5ff] hover:bg-[#0090dd] transition-colors rounded text-xs font-semibold text-white shrink-0"
            >
              Move all Robots
            </button>
          </div>
        </div>

        {/* Alerts Row */}
        <div className="shrink-0 h-72 lg:h-56 min-h-0 overflow-hidden">
          <AlertHistory />
        </div>
      </div>
    </div>
  );
}
