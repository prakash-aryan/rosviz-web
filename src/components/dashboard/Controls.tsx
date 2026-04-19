'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronRight, 
  Home,
  Navigation,
  MapPin,
  RotateCw,
  Pause,
  Play,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ArrowRight,
  Edit2,
  Save,
  X,
  Info,
  Cpu,
  Signal,
  Battery
} from 'lucide-react';
import { useROS } from '@/hooks/useROS';

interface Waypoint {
  id: string;
  lat: string;
  lng: string;
  label: string;
}

interface TwistMessage {
  linear: {
    x: number;
    y: number;
    z: number;
  };
  angular: {
    x: number;
    y: number;
    z: number;
  };
}

// Define the Supply message type
interface SupplyMessage {
  header?: {
    seq: number;
    stamp: { secs: number; nsecs: number };
    frame_id: string;
  };
  voltage: number[];
  current?: number[];
}

export default function Controls() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { id: '1', lat: "40.7128", lng: "-74.0060", label: "Point A" },
    { id: '2', lat: "40.7580", lng: "-73.9855", label: "Point B" }
  ]);
  const [customLat, setCustomLat] = useState("");
  const [customLng, setCustomLng] = useState("");
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [missionStatus, setMissionStatus] = useState<'idle' | 'active' | 'paused'>('idle');
  const [moveSpeed, setMoveSpeed] = useState(0.5); // Default speed in m/s
  const [currentTwist, setCurrentTwist] = useState<TwistMessage>({
    linear: { x: 0, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: 0 }
  });
  
  // System stats for bottom panel
  const [batteryLevel, setBatteryLevel] = useState(87);
  const [cpuTemp, setCpuTemp] = useState(42);
  const [signalStrength, setSignalStrength] = useState(85);
  const [systemStatus, setSystemStatus] = useState('Normal');
  
  // Keep track of pressed buttons for continuous movement
  const pressedKeys = useRef<Record<string, boolean>>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    turnLeft: false,
    turnRight: false
  });
  
  // ROS connection
  const { isConnected, publish, subscribe } = useROS({
    url: 'ws://localhost:9090',
    autoConnect: true
  });

  const handleEditPoint = (point: Waypoint) => {
    setEditingPoint(point.id);
    setEditLat(point.lat);
    setEditLng(point.lng);
  };

  const handleSavePoint = (id: string) => {
    setWaypoints(waypoints.map(point => 
      point.id === id 
        ? { ...point, lat: editLat, lng: editLng }
        : point
    ));
    setEditingPoint(null);
  };
  
  // Function to publish velocity commands
  const publishCmd = (twist: TwistMessage) => {
    if (!isConnected) return;
    
    setCurrentTwist(twist);
    publish('/cmd_vel', 'geometry_msgs/Twist', twist);
  };
  
  // Stop movement
  const stopMovement = () => {
    const zeroTwist: TwistMessage = {
      linear: { x: 0, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: 0 }
    };
    publishCmd(zeroTwist);
    
    // Reset all pressed keys
    Object.keys(pressedKeys.current).forEach(key => {
      pressedKeys.current[key] = false;
    });
  };
  
  // Movement handlers with mouse events for continuous movement while button is held
  const startMovement = (direction: string) => {
    pressedKeys.current[direction] = true;
    updateMovement();
  };
  
  const endMovement = (direction: string) => {
    pressedKeys.current[direction] = false;
    updateMovement();
  };
  
  // Update movement based on currently pressed keys
  const updateMovement = () => {
    const twist: TwistMessage = {
      linear: { x: 0, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: 0 }
    };
    
    // Linear movement
    if (pressedKeys.current.forward) twist.linear.x = moveSpeed;
    if (pressedKeys.current.backward) twist.linear.x = -moveSpeed;
    if (pressedKeys.current.left) twist.linear.y = moveSpeed;
    if (pressedKeys.current.right) twist.linear.y = -moveSpeed;
    if (pressedKeys.current.up) twist.linear.z = moveSpeed;
    if (pressedKeys.current.down) twist.linear.z = -moveSpeed;
    
    // Angular movement (rotation)
    if (pressedKeys.current.turnLeft) twist.angular.z = moveSpeed;
    if (pressedKeys.current.turnRight) twist.angular.z = -moveSpeed;
    
    publishCmd(twist);
  };
  
  const handleEmergencyStop = () => {
    stopMovement();
  };
  
  const handleForceLand = () => {
    // Stop horizontal movement
    stopMovement();
    
    // Command a slow descent
    const landingTwist: TwistMessage = {
      linear: { x: 0, y: 0, z: -0.2 }, // Slow descent
      angular: { x: 0, y: 0, z: 0 }
    };
    publishCmd(landingTwist);
    
    // Reset after 5 seconds
    setTimeout(() => {
      stopMovement();
    }, 5000);
  };
  
  const toggleMission = () => {
    if (missionStatus === 'idle' || missionStatus === 'paused') {
      setMissionStatus('active');
    } else {
      setMissionStatus('paused');
      stopMovement();
    }
  };

  const returnHome = () => {
    stopMovement();
  };

  const navigateToCoordinates = () => {
    if (!customLat || !customLng) return;
    console.log(`Navigating to: ${customLat}, ${customLng}`);
    setCustomLat("");
    setCustomLng("");
  };

  // Simulate changing system stats for demo
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate small random changes to system stats
      setBatteryLevel(prev => Math.max(0, Math.min(100, prev + (Math.random() * 2 - 1) * 0.5)));
      setCpuTemp(prev => Math.max(30, Math.min(70, prev + (Math.random() * 2 - 1) * 0.3)));
      setSignalStrength(prev => Math.max(40, Math.min(100, prev + (Math.random() * 2 - 1) * 1)));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Subscribe to battery data if available
  useEffect(() => {
    if (!isConnected) return;
    
    const batteryUnsubscribe = subscribe<any>('/battery_state', 'sensor_msgs/BatteryState', (message) => {
      if (message && message.percentage !== undefined) {
        setBatteryLevel(message.percentage * 100);
      } else if (message && message.voltage !== undefined) {
        // Fallback: convert voltage to percentage (12.6V=100%, 9V=0%)
        const percentage = Math.min(100, Math.max(0, ((message.voltage - 9) / (12.6 - 9)) * 100));
        setBatteryLevel(percentage);
      }
    });
    
    return () => {
      batteryUnsubscribe();
    };
  }, [isConnected, subscribe]);
  
  // Cleanup effect to ensure we stop sending commands when component unmounts
  useEffect(() => {
    return () => {
      stopMovement();
    };
  }, []);

  // Main motion values display
  const getMotionValueColor = (value: number) => {
    return value === 0 ? 'text-gray-500' : value > 0 ? 'text-green-400' : 'text-red-400';
  };
  
  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] rounded-sm p-2 border border-[#333333]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#00a5ff] text-base font-semibold">Robot Controls</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
        {/* Connection Status */}
        <div className="py-1 px-2 bg-[#252525] rounded-md flex items-center text-xs">
          <span className={`inline-flex items-center ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {/* Mission Controls */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9"
            onClick={returnHome}
          >
            <Home className="w-4 h-4 mr-2" />
            Return Home
          </Button>
          <Button
            variant="outline"
            className={`bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9 ${
              missionStatus === 'active' ? 'border-green-600' : ''
            }`}
            onClick={toggleMission}
          >
            {missionStatus === 'idle' || missionStatus === 'paused' ? (
              <Play className="w-4 h-4 mr-2" />
            ) : (
              <Pause className="w-4 h-4 mr-2" />
            )}
            {missionStatus === 'idle' || missionStatus === 'paused' ? 'Start Mission' : 'Pause Mission'}
          </Button>
        </div>

        {/* Current Motion Display */}
        <div className="bg-[#252525] rounded-md p-2 grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-xs">Forward/Back</span>
            <span className={`text-base font-mono ${getMotionValueColor(currentTwist.linear.x)}`}>
              {currentTwist.linear.x.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-xs">Left/Right</span>
            <span className={`text-base font-mono ${getMotionValueColor(currentTwist.linear.y)}`}>
              {currentTwist.linear.y.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-xs">Up/Down</span>
            <span className={`text-base font-mono ${getMotionValueColor(currentTwist.linear.z)}`}>
              {currentTwist.linear.z.toFixed(1)}
            </span>
          </div>
        </div>
        
        {/* Controls and Waypoints */}
        <div className="grid grid-cols-[auto,1fr] gap-3">
          {/* Navigation Controls */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-1 w-[120px]">
              <div />
              <Button 
                size="icon" 
                variant="outline" 
                className="bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9 w-9"
                onMouseDown={() => startMovement('forward')}
                onMouseUp={() => endMovement('forward')}
                onMouseLeave={() => endMovement('forward')}
                onTouchStart={() => startMovement('forward')}
                onTouchEnd={() => endMovement('forward')}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <div />
              <Button 
                size="icon" 
                variant="outline" 
                className="bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9 w-9"
                onMouseDown={() => startMovement('left')}
                onMouseUp={() => endMovement('left')}
                onMouseLeave={() => endMovement('left')}
                onTouchStart={() => startMovement('left')}
                onTouchEnd={() => endMovement('left')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                size="icon" 
                variant="outline" 
                className="bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9 w-9"
                onClick={stopMovement}
              >
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
              </Button>
              <Button 
                size="icon" 
                variant="outline" 
                className="bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9 w-9"
                onMouseDown={() => startMovement('right')}
                onMouseUp={() => endMovement('right')}
                onMouseLeave={() => endMovement('right')}
                onTouchStart={() => startMovement('right')}
                onTouchEnd={() => endMovement('right')}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
              <div />
              <Button 
                size="icon" 
                variant="outline" 
                className="bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9 w-9"
                onMouseDown={() => startMovement('backward')}
                onMouseUp={() => endMovement('backward')}
                onMouseLeave={() => endMovement('backward')}
                onTouchStart={() => startMovement('backward')}
                onTouchEnd={() => endMovement('backward')}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <div />
            </div>
            
            {/* Altitude and Rotation Controls */}
            <div className="grid grid-cols-2 gap-1 w-[120px]">
              <div className="text-xs text-gray-500 font-medium col-span-2">ALTITUDE</div>
              <Button 
                size="icon" 
                variant="outline" 
                className="bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9"
                onMouseDown={() => startMovement('up')}
                onMouseUp={() => endMovement('up')}
                onMouseLeave={() => endMovement('up')}
                onTouchStart={() => startMovement('up')}
                onTouchEnd={() => endMovement('up')}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button 
                size="icon" 
                variant="outline" 
                className="bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9"
                onMouseDown={() => startMovement('down')}
                onMouseUp={() => endMovement('down')}
                onMouseLeave={() => endMovement('down')}
                onTouchStart={() => startMovement('down')}
                onTouchEnd={() => endMovement('down')}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              
              <div className="text-xs text-gray-500 font-medium col-span-2 mt-1">ROTATION</div>
              <Button 
                size="icon" 
                variant="outline" 
                className="bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9"
                onMouseDown={() => startMovement('turnLeft')}
                onMouseUp={() => endMovement('turnLeft')}
                onMouseLeave={() => endMovement('turnLeft')}
                onTouchStart={() => startMovement('turnLeft')}
                onTouchEnd={() => endMovement('turnLeft')}
              >
                <RotateCw className="w-4 h-4 transform -scale-x-100" />
              </Button>
              <Button 
                size="icon" 
                variant="outline" 
                className="bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9"
                onMouseDown={() => startMovement('turnRight')}
                onMouseUp={() => endMovement('turnRight')}
                onMouseLeave={() => endMovement('turnRight')}
                onTouchStart={() => startMovement('turnRight')}
                onTouchEnd={() => endMovement('turnRight')}
              >
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Waypoints */}
          <div className="flex flex-col gap-2">
            <div className="text-xs text-gray-400 font-medium">WAYPOINTS</div>
            <div className="space-y-2">
              {waypoints.map((point) => (
                <div key={point.id} className="flex gap-2">
                  {editingPoint === point.id ? (
                    <>
                      <Input
                        value={editLat}
                        onChange={(e) => setEditLat(e.target.value)}
                        placeholder="Latitude"
                        className="flex-1 h-9 bg-[#1e1e1e] border-[#333333] text-gray-300 text-xs"
                      />
                      <Input
                        value={editLng}
                        onChange={(e) => setEditLng(e.target.value)}
                        placeholder="Longitude"
                        className="flex-1 h-9 bg-[#1e1e1e] border-[#333333] text-gray-300 text-xs"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-green-500"
                        onClick={() => handleSavePoint(point.id)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-red-500"
                        onClick={() => setEditingPoint(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 justify-start h-9"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        {point.label}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-gray-400"
                        onClick={() => handleEditPoint(point)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            {/* Speed Control */}
            <div className="mt-1">
              <div className="text-xs text-gray-400 font-medium">SPEED (m/s)</div>
              <div className="flex gap-2 items-center mt-1">
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={moveSpeed}
                  onChange={(e) => setMoveSpeed(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-[#1e1e1e] rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-gray-300 w-8 text-right">{moveSpeed.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Navigation */}
        <div className="space-y-1">
          <div className="text-xs text-gray-400 font-medium">CUSTOM NAVIGATION</div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="text"
              placeholder="Latitude"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              className="h-9 bg-[#1e1e1e] border-[#333333] text-gray-300 text-xs"
            />
            <Input
              type="text"
              placeholder="Longitude"
              value={customLng}
              onChange={(e) => setCustomLng(e.target.value)}
              className="h-9 bg-[#1e1e1e] border-[#333333] text-gray-300 text-xs"
            />
          </div>
          <Button
            variant="outline"
            className="w-full bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333333] text-gray-300 h-9"
            disabled={!customLat || !customLng}
            onClick={navigateToCoordinates}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Navigate to Coordinates
          </Button>
        </div>
        
        {/* System Status */}
        <div className="bg-[#252525] rounded-md p-2 mt-auto">
          <div className="text-xs text-gray-400 font-medium mb-1">SYSTEM STATUS</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-blue-400" />
              <div className="flex-1">
                <div className="text-xs text-gray-400">Battery</div>
                <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                  <div 
                    className="bg-blue-400 rounded-full h-1" 
                    style={{ width: `${batteryLevel}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-300 mt-0.5">{batteryLevel.toFixed(0)}%</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-green-400" />
              <div>
                <div className="text-xs text-gray-400">CPU Temp</div>
                <div className="text-xs text-gray-300">{cpuTemp.toFixed(1)}°C</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Signal className="w-4 h-4 text-yellow-400" />
              <div className="flex-1">
                <div className="text-xs text-gray-400">Signal</div>
                <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                  <div 
                    className="bg-yellow-400 rounded-full h-1" 
                    style={{ width: `${signalStrength}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-300 mt-0.5">{signalStrength.toFixed(0)}%</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-xs text-gray-400">Status</div>
                <div className="text-xs text-gray-300">{systemStatus}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Emergency Controls */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="destructive"
            className="bg-red-900/30 hover:bg-red-900/50 h-9"
            onClick={handleEmergencyStop}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Emergency Stop
          </Button>
          <Button
            variant="destructive"
            className="bg-orange-900/30 hover:bg-orange-900/50 h-9"
            onClick={handleForceLand}
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Force Land
          </Button>
        </div>
      </div>
    </div>
  );
}