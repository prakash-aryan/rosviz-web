# ROSViz Web

A real-time web dashboard for monitoring and controlling ROS 2 robots. Built with Next.js, Three.js, and rosbridge. Tested with TurtleBot3 Waffle running in Ignition Gazebo Fortress on Ubuntu 22.04.

![Dashboard](https://img.shields.io/badge/ROS_2-Humble-blue) ![Gazebo](https://img.shields.io/badge/Gazebo-Fortress-orange) ![Ubuntu](https://img.shields.io/badge/Ubuntu-22.04-purple) ![Next.js](https://img.shields.io/badge/Next.js-15-black)

## Features

- **Live Camera Feed** — Streaming compressed camera images with HUD telemetry overlay
- **6-Camera Grid** — Multi-camera view with maximize/minimize per feed
- **3D Robot Model** — URDF-based robot visualization using Three.js, updated via TF
- **LiDAR Point Cloud** — Real-time 3D point cloud rendering from `PointCloud2` messages
- **Telemetry Panel** — 12-card grid showing position, orientation, velocities from odometry/IMU
- **Depth Data** — LaserScan range statistics with live chart
- **Battery Monitor** — Voltage tracking with time-series graph
- **Robot Controls** — D-pad, speed slider, waypoints, emergency stop, publishing to `/cmd_vel`
- **Resizable Panels** — Drag-to-resize layout using split.js

## Tested Environment

- **OS:** Ubuntu 22.04 (Jammy)
- **ROS 2:** Humble Hawksbill
- **Simulator:** Ignition Gazebo Fortress (6.x)
- **Robot:** TurtleBot3 Waffle
- **Bridge:** rosbridge_suite (WebSocket on port 9090)
- **Browser:** Chromium / Chrome

## Run project with docker
> It can be interesting to implement the Cuda GPU version
### Prerequisites
- Docker and docker compose (v2+)
- (optional) AMD Radeon GPU with amd GPU kernel drivers. 

### Launch in CPU mode
```sh
docker compose up --build
```

### Launch in AMD-GPU mode (Linux)
```sh
# One-time host setup — add your user to the video/render groups
sudo usermod -aG video,render $USER
# Log out and back in for group changes to take effect

docker compose -f docker-compose.yml -f docker-compose.amdgpu.yml up --build
```

### Editing code
Source folders are bind-mounted into the containers, so you can edit files directly on your host:

- `src/` and `public/` → Next.js hot-reloads automatically
- `simulation/` and `scripts/` → restart the _ros-stack_ container to pick up changes (`docker compose restart ros-stack` or if AMD-GPU `docker compose -f docker-compose.yml -f docker-compose.amdgpu.yml restart ros-stack` or `ctrl+c` and run again `docker compose up`)

### Shutdown
```sh
docker compose down
```

## Prerequisites

### System

- Ubuntu 22.04
- Node.js 18+ and npm
- ROS 2 Humble ([install guide](https://docs.ros.org/en/humble/Installation/Ubuntu-Install-Debs.html))
- Ignition Gazebo Fortress ([install guide](https://gazebosim.org/docs/fortress/install_ubuntu))

### ROS 2 Packages

Install the TurtleBot3 packages:

```bash
sudo apt install \
  ros-humble-turtlebot3* \
  ros-humble-robot-state-publisher \
  ros-humble-image-transport
```

Build or install these from source if not available via apt:

- **rosbridge_suite** — WebSocket bridge between ROS 2 and the browser
- **ros_gz_bridge** — Bridges Ignition Gazebo topics to ROS 2 topics

> If you don't have sudo, both can be built from source in a colcon workspace. See [Building from Source](#building-ros-packages-from-source) below.

### Python (for image compression node)

```bash
pip3 install opencv-python numpy
```

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/prakash-aryan/ros-dashboard-main-three.git
cd ros-dashboard-main-three
```

### 2. Install dashboard dependencies

```bash
npm install
```

### 3. Start the simulation stack

Open separate terminals for each (or use the provided launch script):

**Terminal 1 — Ignition Gazebo (headless)**

```bash
source /opt/ros/humble/setup.bash
export IGN_GAZEBO_RESOURCE_PATH=<path-to>/simulation/models

ign gazebo -s -r <path-to>/simulation/worlds/turtlebot3_world.sdf
```

**Terminal 2 — ros_gz_bridge**

```bash
source /opt/ros/humble/setup.bash
# source your colcon workspace if built from source
# source ~/turtlebot3_ws/install/setup.bash

ros2 run ros_gz_bridge parameter_bridge \
  /cmd_vel@geometry_msgs/msg/Twist]ignition.msgs.Twist \
  /odom@nav_msgs/msg/Odometry[ignition.msgs.Odometry \
  /tf@tf2_msgs/msg/TFMessage[ignition.msgs.Pose_V \
  /scan@sensor_msgs/msg/LaserScan[ignition.msgs.LaserScan \
  /imu@sensor_msgs/msg/Imu[ignition.msgs.IMU \
  /camera/image_raw@sensor_msgs/msg/Image[ignition.msgs.Image \
  /joint_states@sensor_msgs/msg/JointState[ignition.msgs.Model \
  /scan/points@sensor_msgs/msg/PointCloud2[ignition.msgs.PointCloudPacked
```

**Terminal 3 — Image compressor (raw → JPEG for the browser)**

```bash
source /opt/ros/humble/setup.bash
python3 scripts/image_compressor.py
```

**Terminal 4 — Robot state publisher**

```bash
source /opt/ros/humble/setup.bash
ros2 run robot_state_publisher robot_state_publisher \
  --ros-args --param use_sim_time:=false \
  -- <path-to-turtlebot3-waffle-urdf>
```

**Terminal 5 — rosbridge WebSocket server**

```bash
source /opt/ros/humble/setup.bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

**Terminal 6 — Dashboard**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Using the launch script

A convenience script is included that starts everything in one go:

```bash
bash simulation/launch_all.sh
```

> Edit paths inside the script to match your workspace layout.

## Project Structure

```
rosviz-web/
├── public/
│   └── meshes/turtlebot3/       # STL meshes for 3D robot model
│       ├── bases/
│       ├── sensors/
│       └── wheels/
├── scripts/
│   └── image_compressor.py      # ROS 2 node: raw Image → CompressedImage
├── simulation/
│   ├── launch_all.sh            # One-command launcher for full stack
│   ├── models/
│   │   └── turtlebot3_waffle/   # Ignition Gazebo SDF model
│   └── worlds/
│       └── turtlebot3_world.sdf # World with walls, obstacles, robot
├── src/
│   ├── components/dashboard/    # React dashboard components
│   │   ├── Controls.tsx         # D-pad, waypoints, emergency stop
│   │   ├── TelemetryPanel.tsx   # 12-card telemetry grid
│   │   ├── VideoGrid.tsx        # 6-camera grid view
│   │   ├── VideoStream.tsx      # Single compressed image stream
│   │   └── sensor-components/
│   │       ├── BatteryStats.tsx  # Voltage chart
│   │       ├── DepthData.tsx     # LaserScan statistics
│   │       ├── PointCloud.tsx    # LiDAR point cloud (Three.js)
│   │       ├── RobotModel.tsx    # URDF 3D model (Three.js)
│   │       └── VideoFeed.tsx     # Camera feed with HUD overlay
│   ├── hooks/useROS.ts          # React hook for rosbridge connection
│   ├── lib/rosbridge.ts         # WebSocket client singleton
│   └── types/ros.ts             # ROS message type definitions
├── package.json
└── README.md
```

## ROS Topics Used

| Topic | Type | Direction | Description |
|-------|------|-----------|-------------|
| `/odom` | `nav_msgs/Odometry` | Sub | Robot odometry (position, velocity) |
| `/tf` | `tf2_msgs/TFMessage` | Sub | Transform tree for 3D model |
| `/scan` | `sensor_msgs/LaserScan` | Sub | LiDAR range data |
| `/scan/points` | `sensor_msgs/PointCloud2` | Sub | LiDAR point cloud |
| `/imu` | `sensor_msgs/Imu` | Sub | IMU orientation, angular velocity |
| `/camera/image_raw/compressed` | `sensor_msgs/CompressedImage` | Sub | JPEG camera feed |
| `/battery_state` | `sensor_msgs/BatteryState` | Sub | Voltage, percentage |
| `/robot_description` | `std_msgs/String` | Param | URDF for 3D model |
| `/cmd_vel` | `geometry_msgs/Twist` | Pub | Velocity commands |

## Building ROS Packages from Source

If you can't install via apt (e.g., no sudo), build in a colcon workspace:

```bash
mkdir -p ~/turtlebot3_ws/src && cd ~/turtlebot3_ws/src

# rosbridge_suite
git clone https://github.com/RobotWebTools/rosbridge_suite.git -b ros2

# ros_gz (Fortress)
git clone https://github.com/gazebosim/ros_gz.git -b humble

# Dependencies that ros_gz may need
git clone https://github.com/rudislabs/actuator_msgs.git
git clone https://github.com/swri-robotics/gps_umd.git

cd ~/turtlebot3_ws
source /opt/ros/humble/setup.bash
colcon build --cmake-args -DBUILD_TESTING=OFF
source install/setup.bash
```

## Customizing Topics

All topic names are defined in the component files under `src/components/dashboard/`. Each component's `useEffect` or subscription call specifies the topic and message type. Change them to match your robot's topic namespace.

The default rosbridge WebSocket URL (`ws://localhost:9090`) is set in `src/hooks/useROS.ts`.

## License

[MIT](LICENSE)
