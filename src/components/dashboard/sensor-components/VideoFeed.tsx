'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Navigation, 
  Gauge,
  Crosshair,
  RadioTower,
  MoveDiagonal
} from 'lucide-react';
import { useROS } from '@/hooks/useROS';

interface TelemetryData {
  altitude: number;
  heading: number;
  speed: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  distanceFromHome: number;
}

const VideoFeed = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    altitude: 0,
    heading: 0,
    speed: 0,
    position: { x: 0, y: 0, z: 0 },
    distanceFromHome: 0
  });
  const homePos = useRef({ x: 0, y: 0, z: 0 });
  const { subscribe, isConnected } = useROS();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const lastProcessTime = useRef<number>(0);
  const lastTelemetryUpdate = useRef<number>(0);
  const processingFrame = useRef<boolean>(false);
  const frameCounter = useRef<number>(0);
  const animationFrameId = useRef<number>(0);
  const hudUpdateCounter = useRef<number>(0);
  
  // Constants for performance tuning
  const FRAME_RATE = 3; // Reduced to 3 fps
  const FRAME_INTERVAL = 1000 / FRAME_RATE;
  const TELEMETRY_UPDATE_INTERVAL = 1000; // Increased to 1000ms (1 second)
  const HUD_UPDATE_INTERVAL = 5; // Only update HUD every 5th frame
  
  // Create a resize observer for the canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const handleResize = () => {
      if (!canvasRef.current) return;
      const parent = canvasRef.current.parentElement;
      if (!parent) return;

      // Match canvas size to parent element
      canvasRef.current.width = parent.clientWidth;
      canvasRef.current.height = parent.clientHeight;
      
      // Clear and fill with black to prevent flashing
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', handleResize);
    // Initial size
    setTimeout(handleResize, 0);

    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Draw both image and HUD to canvas in one operation
  const renderFrame = useCallback((imgBlob: Blob | null = null) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    
    // Update image if we have a new one
    if (imgBlob) {
      const img = new Image();
      img.onload = () => {
        // Scale the image to fit the canvas while maintaining aspect ratio
        const scale = Math.min(width / img.width, height / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = (width - scaledWidth) / 2;
        const offsetY = (height - scaledHeight) / 2;
        
        // Clear canvas first
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        
        // Draw image centered and scaled
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        
        // Release resource and signal completion
        URL.revokeObjectURL(img.src);
        
        // Draw HUD on top of the image
        drawHUD(ctx, width, height);
        
        processingFrame.current = false;
      };
      
      img.onerror = () => {
        processingFrame.current = false;
        setError('Failed to load image');
      };
      
      img.src = URL.createObjectURL(imgBlob);
    } else {
      // Just update the HUD
      hudUpdateCounter.current++;
      
      // Only update HUD every few frames to save CPU
      if (hudUpdateCounter.current % HUD_UPDATE_INTERVAL === 0) {
        drawHUD(ctx, width, height);
      }
    }
  }, [telemetry]);
  
  // HUD drawing function
  const drawHUD = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // We don't clear the canvas here since we've already drawn the image
    
    // Draw crosshair
    const crosshairSize = 20; // Reduced size
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(width/2 - crosshairSize, height/2);
    ctx.lineTo(width/2 + crosshairSize, height/2);
    ctx.stroke();
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(width/2, height/2 - crosshairSize);
    ctx.lineTo(width/2, height/2 + crosshairSize);
    ctx.stroke();
    
    // Center circle
    ctx.beginPath();
    ctx.arc(width/2, height/2, 3, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.stroke();
    
    // Display telemetry data with minimal rendering
    // Top bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(10, 10, 140, 36);
    ctx.fillStyle = '#4ade80'; // Green
    ctx.font = '12px monospace';
    ctx.fillText(`HDG: ${telemetry.heading.toFixed(0)}° | SPD: ${telemetry.speed.toFixed(1)}m/s`, 15, 30);
    
    // Position data - bottom left
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(10, height - 40, 200, 30);
    ctx.fillStyle = '#22d3ee'; // Cyan
    ctx.fillText(`POS: ${telemetry.position.x.toFixed(1)}, ${telemetry.position.y.toFixed(1)}, ${telemetry.altitude.toFixed(1)}m`, 15, height - 20);
  };
  
  // Main animation loop - much less frequent updates
  useEffect(() => {
    const animate = () => {
      renderFrame();
      animationFrameId.current = requestAnimationFrame(animate);
    };
    
    animationFrameId.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [renderFrame]);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Video feed subscription with performance optimizations
    if (isConnected) {
      unsubscribers.push(
        subscribe('/camera/image_raw/compressed', 'sensor_msgs/CompressedImage', (message: any) => {
          try {
            // Skip if already processing a frame or if it's too soon
            if (processingFrame.current) return;
            
            const now = performance.now();
            frameCounter.current++;
            
            // Process every 5th frame and respect frame rate
            if (
              frameCounter.current % 5 !== 0 || 
              now - lastProcessTime.current < FRAME_INTERVAL
            ) {
              return;
            }
            
            processingFrame.current = true;
            lastProcessTime.current = now;
            
            if (!canvasRef.current) {
              processingFrame.current = false;
              return;
            }

            const byteArray = new Uint8Array(message.data);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            
            renderFrame(blob);
          } catch (err) {
            processingFrame.current = false;
            setError(err instanceof Error ? err.message : 'Error loading image');
          }
        })
      );
    }

    // Combined telemetry subscription with aggressive throttling
    unsubscribers.push(
      subscribe('/odom', 'nav_msgs/Odometry', (message: any) => {
        const now = performance.now();
        if (now - lastTelemetryUpdate.current < TELEMETRY_UPDATE_INTERVAL) {
          return;
        }
        
        const pos = message.pose.pose.position;
        const quat = message.pose.pose.orientation;
        const vel = message.twist.twist.linear;

        // Calculate heading from quaternion
        const heading = Math.atan2(
          2 * (quat.w * quat.z + quat.x * quat.y),
          1 - 2 * (quat.y * quat.y + quat.z * quat.z)
        ) * (180 / Math.PI);

        // Calculate speed from velocity components
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

        // Calculate distance from home
        const dx = pos.x - homePos.current.x;
        const dy = pos.y - homePos.current.y;
        const dz = pos.z - homePos.current.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Update entire telemetry state in one call to prevent multiple renders
        setTelemetry({
          heading: heading,
          speed: speed,
          position: pos,
          altitude: pos.z, // Use Z position as altitude for ground robots
          distanceFromHome: distance
        });
        
        lastTelemetryUpdate.current = now;
      })
    );

    // Use Z position from odom as altitude for ground robots
    // (already handled in the /odom subscription above)

    return () => {
      unsubscribers.forEach(unsub => unsub());
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [subscribe, isConnected, renderFrame]);

  return (
    <div className="w-full h-full bg-black rounded-sm relative overflow-hidden">
      {/* Video Feed with single Canvas */}
      <div className="relative w-full h-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ backgroundColor: 'black' }}
        />
        {error && (
          <div className="absolute top-2 left-2 bg-red-500/75 text-white text-xs p-1 rounded">
            {error}
          </div>
        )}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            No Signal
          </div>
        )}
      </div>

      {/* Static legend - doesn't need to update frequently */}
      <div className="absolute right-4 top-4 bg-black/40 rounded p-2 backdrop-blur-sm">
        <div className="text-gray-300 text-xs font-medium mb-1">Telemetry</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1">
            <Navigation className="w-3 h-3 text-green-500" />
            <span className="text-gray-200">Heading</span>
          </div>
          <div className="flex items-center gap-1">
            <Gauge className="w-3 h-3 text-blue-400" />
            <span className="text-gray-200">Speed</span>
          </div>
          <div className="flex items-center gap-1">
            <MoveDiagonal className="w-3 h-3 text-emerald-400" />
            <span className="text-gray-200">Position</span>
          </div>
        </div>
      </div>

      {/* Vignette effect */}
      <div 
        className="absolute inset-0 z-5 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.3) 100%)'
        }}
      />
    </div>
  );
};

export default VideoFeed;