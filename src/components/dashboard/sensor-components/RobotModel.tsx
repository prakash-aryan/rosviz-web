'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import URDFLoader from 'urdf-loader';
import { useROS } from '@/hooks/useROS';
import type { Odometry } from '@/types/ros';
import rosbridge from '@/lib/rosbridge';

interface TransformMsg {
  header: {
    frame_id: string;
  };
  child_frame_id: string;
  transform: {
    translation: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
  };
}

const RobotModel = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const robotModelRef = useRef<THREE.Object3D | null>(null);
  const mountedRef = useRef<boolean>(true);
  const linkGroupsRef = useRef<Record<string, THREE.Group>>({});
  const initializedRef = useRef(false);
  const lastPositionRef = useRef(new THREE.Vector3());
  const originalPositionRef = useRef<THREE.Vector3 | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [delayComplete, setDelayComplete] = useState(false);
  const [robotState, setRobotState] = useState<Odometry | null>(null);

  const { isConnected, subscribe } = useROS({
    url: 'ws://localhost:9090',
    autoConnect: true
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayComplete(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const loadSTLMesh = async (path: string, color: number): Promise<THREE.Mesh> => {
    return new Promise((resolve, reject) => {
      const loader = new STLLoader();
      loader.load(
        path,
        (geometry) => {
          const material = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 30,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
          });
          const mesh = new THREE.Mesh(geometry, material);

          const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.2
            })
          );
          mesh.add(wireframe);

          const axesHelper = new THREE.AxesHelper(0.2);
          mesh.add(axesHelper);

          resolve(mesh);
        },
        undefined,
        reject
      );
    });
  };

  const loadURDFModel = async () => {
    if (!sceneRef.current) return;

    try {
      console.log('[RobotModel] Loading URDF from robot_description param...');
      let paramResponse;
      try {
        paramResponse = await rosbridge.getParam('/robot_state_publisher:robot_description');
      } catch {
        console.log('[RobotModel] Trying alternate param path...');
        paramResponse = await rosbridge.getParam('/robot_description');
      }
      console.log('[RobotModel] Param response type:', typeof paramResponse);

      let urdfContent = paramResponse;
      if (typeof paramResponse === 'object' && paramResponse !== null) {
        if ('value' in paramResponse) {
          urdfContent = paramResponse.value;
        } else if ('values' in paramResponse && 'value' in paramResponse.values) {
          urdfContent = paramResponse.values.value;
        }
      }

      if (!urdfContent || typeof urdfContent !== 'string') {
        console.error('[RobotModel] Invalid URDF content:', typeof urdfContent);
        throw new Error('Invalid URDF content');
      }
      console.log('[RobotModel] URDF content length:', urdfContent.length);

      const cleanedXML = urdfContent.replace(/\\r\\n/g, '\n')
                                  .replace(/\\r/g, '')
                                  .replace(/\\n/g, '\n')
                                  .replace(/\\"/g, '"')
                                  .replace(/\\\\/g, '\\')
                                  .replace(/^"|"$/g, '');

      const loader = new URDFLoader();
      
      loader.loadMeshCb = async (path, manager, done) => {
        console.log('[RobotModel] Loading mesh:', path);
        try {
          let mesh: THREE.Object3D;

          if (path.includes('waffle_base')) {
            mesh = await loadSTLMesh('/meshes/turtlebot3/bases/waffle_base.stl', 0x333333);
          } else if (path.includes('burger_base')) {
            mesh = await loadSTLMesh('/meshes/turtlebot3/bases/burger_base.stl', 0x333333);
          } else if (path.includes('waffle_pi_base')) {
            mesh = await loadSTLMesh('/meshes/turtlebot3/bases/waffle_pi_base.stl', 0x333333);
          } else if (path.includes('lds')) {
            mesh = await loadSTLMesh('/meshes/turtlebot3/sensors/lds.stl', 0x22c55e);
          } else if (path.includes('tire') || path.includes('left_tire') || path.includes('right_tire')) {
            // Both wheels use the same tire mesh in the URDF
            mesh = await loadSTLMesh('/meshes/turtlebot3/wheels/left_tire.stl', 0x111111);
          } else if (path.includes('r200') || path.includes('astra')) {
            const geometry = new THREE.BoxGeometry(0.02, 0.08, 0.02);
            const material = new THREE.MeshPhongMaterial({
              color: 0x0066ff,
              transparent: true,
              opacity: 0.9
            });
            mesh = new THREE.Mesh(geometry, material);
          } else {
            console.log('[RobotModel] Unknown mesh, using fallback:', path);
            const geometry = new THREE.BoxGeometry(0.03, 0.03, 0.03);
            const material = new THREE.MeshPhongMaterial({
              color: 0x666666,
              transparent: true,
              opacity: 0.8
            });
            mesh = new THREE.Mesh(geometry, material);
          }

          done(mesh);
        } catch (error) {
          console.error('[RobotModel] Mesh load error:', error);
          const geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
          const material = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.7
          });
          const mesh = new THREE.Mesh(geometry, material);
          done(mesh);
        }
      };

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(cleanedXML, 'text/xml');
      
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('XML parsing failed');
      }

      console.log('[RobotModel] Parsing URDF XML...');
      const robot = loader.parse(xmlDoc);
      console.log('[RobotModel] Robot parsed, children:', robot.children.length);
      robot.rotation.set(0, 0, 0);
      robot.scale.set(1, 1, 1);

      const createLinkGroup = (name: string) => {
        const group = new THREE.Group();
        group.name = name;
        
        const axesHelper = new THREE.AxesHelper(0.3);
        group.add(axesHelper);

        const originSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.02),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        group.add(originSphere);

        linkGroupsRef.current[name] = group;
        sceneRef.current?.add(group);
        
        return group;
      };

      createLinkGroup('odom');
      createLinkGroup('base_footprint');
      createLinkGroup('base_link');
      createLinkGroup('base_scan');
      createLinkGroup('imu_link');
      createLinkGroup('wheel_left_link');
      createLinkGroup('wheel_right_link');
      createLinkGroup('caster_back_left_link');
      createLinkGroup('caster_back_right_link');
      createLinkGroup('camera_link');
      createLinkGroup('camera_rgb_frame');
      createLinkGroup('camera_depth_frame');
      createLinkGroup('camera_rgb_optical_frame');
      createLinkGroup('camera_depth_optical_frame');

      const baseLinkGroup = linkGroupsRef.current['base_link'];
      if (baseLinkGroup) {
        baseLinkGroup.add(robot);
        robotModelRef.current = robot;
        
        originalPositionRef.current = baseLinkGroup.position.clone();
      }

      setIsLoading(false);
    } catch (error) {
      console.error('[RobotModel] Error loading model:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!delayComplete || !containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1e1e1e');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0.5, 0.5, 0.4);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0.05);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.5;
    controls.maxDistance = 10;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 2, 2);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-2, -2, 2);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(10, 20, 0x666666, 0x444444);
    grid.rotateX(Math.PI / 2);
    scene.add(grid);

    const axes = new THREE.AxesHelper(1);
    scene.add(axes);

    loadURDFModel();

    const animate = () => {
      if (!mountedRef.current) return;
      requestAnimationFrame(animate);
      

      checkRobotVisibility();
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('resize', handleResize);
      
      if (renderer) {
        containerRef.current?.removeChild(renderer.domElement);
        renderer.dispose();
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, [delayComplete]);

  const checkRobotVisibility = () => {
    const baseLinkGroup = linkGroupsRef.current['base_link'];
    if (!baseLinkGroup || !originalPositionRef.current) return;
    

    const distance = baseLinkGroup.position.length();
    if (distance > 100) {
      console.warn("Robot moved too far, resetting position");
      baseLinkGroup.position.copy(originalPositionRef.current);
    }
  };

  useEffect(() => {
    if (!delayComplete) return;

    const unsubscribeOdom = subscribe<Odometry>(
      '/odom',
      'nav_msgs/Odometry',
      (message) => {
        // Update the UI display only
        setRobotState(message);
      }
    );

    // Let TF handle all the model updates
    const unsubscribeTF = subscribe<{ transforms: TransformMsg[] }>(
      '/tf',
      'tf2_msgs/TFMessage',
      (message) => {
        const tfUpdates: Record<string, boolean> = {};
        
        message.transforms.forEach(transform => {
          // Skip duplicate updates for the same child frame
          if (tfUpdates[transform.child_frame_id]) return;
          tfUpdates[transform.child_frame_id] = true;
          
          const parentGroup = linkGroupsRef.current[transform.header.frame_id];
          const childGroup = linkGroupsRef.current[transform.child_frame_id];
          
          if (parentGroup && childGroup) {
            const newPos = new THREE.Vector3(
              transform.transform.translation.x,
              transform.transform.translation.y,
              transform.transform.translation.z
            );

            // Only update position if it's not extremely far away
            if (newPos.length() < 100) {
              childGroup.position.copy(newPos);
              
              // Keep track of base_link position for telemetry
              if (transform.child_frame_id === 'base_link') {
                lastPositionRef.current.copy(newPos);
              }
            }

            childGroup.quaternion.set(
              transform.transform.rotation.x,
              transform.transform.rotation.y,
              transform.transform.rotation.z,
              transform.transform.rotation.w
            );
          }
        });
      }
    );

    return () => {
      unsubscribeOdom();
      unsubscribeTF();
    };
  }, [delayComplete, subscribe]);

  return (
    <div className="relative w-full h-full bg-[#1a1a1a] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      
      {!delayComplete && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-blue-500 text-sm font-mono">Initializing Robot Model</div>
          </div>
        </div>
      )}

      {/* Connection overlay removed - subscribe works regardless of isConnected state */}

      {robotState && (
        <div className="absolute top-4 right-4 p-3 bg-black/80 rounded-lg text-xs space-y-1">
          <div className="text-blue-500 font-medium">Position</div>
          <div className="text-gray-300">
            X: {robotState.pose.pose.position.x.toFixed(3)}m
            <br />
            Y: {robotState.pose.pose.position.y.toFixed(3)}m
            <br />
            Z: {robotState.pose.pose.position.z.toFixed(3)}m
          </div>
        </div>
      )}
    </div>
  );
};

export default RobotModel;