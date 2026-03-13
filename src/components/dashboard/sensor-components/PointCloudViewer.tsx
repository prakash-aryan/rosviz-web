'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useROS } from '@/hooks/useROS';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface PointCloudViewerProps {
  topic: string;
}

interface PointCloud2Message {
  header: {
    seq: number;
    stamp: { secs: number; nsecs: number };
    frame_id: string;
  };
  height: number;
  width: number;
  fields: {
    name: string;
    offset: number;
    datatype: number;
    count: number;
  }[];
  is_bigendian: boolean;
  point_step: number;
  row_step: number;
  data: Uint8Array;
  is_dense: boolean;
}

const PointCloudViewer: React.FC<PointCloudViewerProps> = ({ topic }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const animationFrameRef = useRef<number>(0);
  const downsampleRef = useRef<number>(2);
  const initializedRef = useRef(false);

  const { subscribe, isConnected } = useROS();
  const [isLoading, setIsLoading] = useState(true);
  const [delayComplete, setDelayComplete] = useState(false);

  // 5-second delay timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayComplete(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Three.js after delay
  useEffect(() => {
    if (!delayComplete || !containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    // Clear existing content
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    sceneRef.current = scene;

    // Add coordinate system
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);
    const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x444444);
    scene.add(gridHelper);

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(2, 3, 2);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 20;
    controlsRef.current = controls;

    // Points setup
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    materialRef.current = material;

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    pointsRef.current = points;

    setIsLoading(false);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [delayComplete]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle point cloud data
  useEffect(() => {
    if (!delayComplete || isLoading || !pointsRef.current) return;

    let frameCount = 0;
    const handlePointCloud = (message: PointCloud2Message) => {
      frameCount++;
      if (frameCount <= 3) {
        console.log(`[PointCloud] Frame ${frameCount}: ${message.width}x${message.height} pts, step=${message.point_step}, data type=${typeof message.data}, data length=${message.data?.length || 'N/A'}`);
        console.log(`[PointCloud] Fields:`, message.fields?.map((f: any) => f.name).join(','));
      }
      const geometry = pointsRef.current!.geometry;
      const fields = message.fields;

      if (!fields || !Array.isArray(fields)) {
        console.error('[PointCloud] No fields in message');
        return;
      }

      const xIdx = fields.findIndex(f => f.name === 'x');
      const yIdx = fields.findIndex(f => f.name === 'y');
      const zIdx = fields.findIndex(f => f.name === 'z');
      const rgbIdx = fields.findIndex(f => f.name === 'rgb');

      if (xIdx === -1 || yIdx === -1 || zIdx === -1) {
        console.error('[PointCloud] Missing xyz fields, found:', fields.map((f: any) => f.name));
        return;
      }

      const positions: number[] = [];
      const colors: number[] = [];
      const stride = message.point_step;
      const dataView = new DataView(message.data.buffer);

      for (let i = 0; i < message.height; i += downsampleRef.current) {
        for (let j = 0; j < message.width; j += downsampleRef.current) {
          const offset = (i * message.width + j) * stride;

          const rosX = dataView.getFloat32(offset + fields[xIdx].offset, true);
          const rosY = dataView.getFloat32(offset + fields[yIdx].offset, true);
          const rosZ = dataView.getFloat32(offset + fields[zIdx].offset, true);

          if (!isFinite(rosX) || !isFinite(rosY) || !isFinite(rosZ)) continue;

          // ROS (X-fwd, Y-left, Z-up) → Three.js (X-right, Y-up, Z-fwd)
          positions.push(rosX, rosZ, rosY);

          if (rgbIdx !== -1) {
            const rgb = dataView.getUint32(offset + fields[rgbIdx].offset, true);
            const r = ((rgb >> 16) & 0xff) / 255;
            const g = ((rgb >> 8) & 0xff) / 255;
            const b = (rgb & 0xff) / 255;
            colors.push(r, g, b);
          } else {
            const distance = Math.sqrt(rosX * rosX + rosY * rosY + rosZ * rosZ);
            const hue = Math.max(0, Math.min(1, distance / 5.0));
            const color = new THREE.Color().setHSL(hue, 1, 0.5);
            colors.push(color.r, color.g, color.b);
          }
        }
      }

      if (frameCount <= 3) {
        console.log(`[PointCloud] Extracted ${positions.length / 3} points`);
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      if (colors.length > 0) {
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      }
      geometry.computeBoundingSphere();
    };

    const unsubscribe = subscribe(topic, 'sensor_msgs/PointCloud2', handlePointCloud);
    return () => unsubscribe();
  }, [delayComplete, isLoading, topic, subscribe]);

  return (
    <div className="relative w-full h-full bg-[#111111]">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Loading overlay */}
      {!delayComplete && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-blue-500 text-sm font-mono">Initializing 3D Viewer</div>
          </div>
        </div>
      )}

      {/* ROS connection overlay - removed isConnected gate due to timing */}
    </div>
  );
};

export default PointCloudViewer;