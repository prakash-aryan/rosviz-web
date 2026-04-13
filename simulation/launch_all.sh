#!/bin/bash
# Launch TurtleBot3 Ignition Gazebo simulation with ROS 2 bridges
#
# Usage:
#   cd rosviz-web
#   bash simulation/launch_all.sh
#
# Prerequisites:
#   - ROS 2 Humble sourced
#   - ros_gz_bridge, rosbridge_suite, robot_state_publisher available
#   - Ignition Gazebo Fortress installed
#   - Python image_compressor deps: pip3 install opencv-python numpy

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Source ROS 2 — edit this if your workspace is elsewhere
source /opt/ros/humble/setup.bash
if [ -f ~/turtlebot3_ws/install/setup.bash ]; then
    source ~/turtlebot3_ws/install/setup.bash
fi

# Set Ignition Gazebo resource path so it finds the turtlebot3_waffle model
export IGN_GAZEBO_RESOURCE_PATH="$SCRIPT_DIR/models:${IGN_GAZEBO_RESOURCE_PATH:-}"

# Kill any existing processes
echo "Cleaning up existing processes..."
pkill -f "ign gazebo" 2>/dev/null || true
pkill -f "parameter_bridge" 2>/dev/null || true
pkill -f "robot_state_publisher" 2>/dev/null || true
pkill -f "rosbridge_websocket" 2>/dev/null || true
pkill -f "image_compressor" 2>/dev/null || true
sleep 2

WORLD_FILE="$SCRIPT_DIR/worlds/turtlebot3_world.sdf"


# 0 Generate robots
echo "Generating $NUM_ROBOTS robot model folders..."
bash "$SCRIPT_DIR/models/generate_robots.sh" "$NUM_ROBOTS"


# 1. Ignition Gazebo (headless server)
echo "[1/6] Starting Ignition Gazebo (headless)..."
ign gazebo -s -r "$WORLD_FILE" &
IGN_PID=$!
sleep 5

if ! kill -0 $IGN_PID 2>/dev/null; then
    echo "ERROR: Ignition Gazebo failed to start!"
    exit 1
fi
echo "  Ignition Gazebo running (PID: $IGN_PID)"

# 2. ros_gz_bridge - one set of topics per robots
echo "[2/6] Starting ros_gz_bridge..."
# Command to start the topics for a single robot
# ros2 run ros_gz_bridge parameter_bridge \
#     /cmd_vel@geometry_msgs/msg/Twist]ignition.msgs.Twist \
#     /odom@nav_msgs/msg/Odometry[ignition.msgs.Odometry \
#     /tf@tf2_msgs/msg/TFMessage[ignition.msgs.Pose_V \
#     /scan@sensor_msgs/msg/LaserScan[ignition.msgs.LaserScan \
#     /imu@sensor_msgs/msg/Imu[ignition.msgs.IMU \
#     /camera/image_raw@sensor_msgs/msg/Image[ignition.msgs.Image \
#     /joint_states@sensor_msgs/msg/JointState[ignition.msgs.Model \
#     /scan/points@sensor_msgs/msg/PointCloud2[ignition.msgs.PointCloudPacked &
# BRIDGE_PID=$!

NUM_ROBOTS=${NUM_ROBOTS:-2}

BRIDGE_ARGS=""
for i in $(seq 0 $((NUM_ROBOTS-1))); do
    BRIDGE_ARGS="$BRIDGE_ARGS \
        /tb3_$i/cmd_vel@geometry_msgs/msg/Twist]ignition.msgs.Twist \
        /tb3_$i/odom@nav_msgs/msg/Odometry[ignition.msgs.Odometry \
        /tb3_$i/tf@tf2_msgs/msg/TFMessage[ignition.msgs.Pose_V \
        /tb3_$i/scan@sensor_msgs/msg/LaserScan[ignition.msgs.LaserScan \
        /tb3_$i/imu@sensor_msgs/msg/Imu[ignition.msgs.IMU \
        /tb3_$i/camera/image_raw@sensor_msgs/msg/Image[ignition.msgs.Image \
        /tb3_$i/joint_states@sensor_msgs/msg/JointState[ignition.msgs.Model"
done

ros2 run ros_gz_bridge parameter_bridge $BRIDGE_ARGS &
BRIDGE_PID=$!

sleep 3
echo "  ros_gz_bridge running (PID: $BRIDGE_PID)"

# 3. Image compressor (raw → JPEG for the browser)
echo "[3/6] Starting image compressor..."
# python3 "$PROJECT_DIR/scripts/image_compressor.py" &
NUM_ROBOTS=$NUM_ROBOTS python3 "$PROJECT_DIR/scripts/image_compressor.py" &
COMPRESSOR_PID=$!
sleep 1
echo "  Image compressor running (PID: $COMPRESSOR_PID)"

# 4. Robot state publisher
echo "[4/6] Starting robot_state_publisher..."
URDF_FILE=""
# Try common URDF locations
for path in \
    ~/turtlebot3_ws/install/turtlebot3_gazebo/share/turtlebot3_gazebo/urdf/turtlebot3_waffle.urdf \
    /opt/ros/humble/share/turtlebot3_gazebo/urdf/turtlebot3_waffle.urdf \
    ~/turtlebot3_ws/install/turtlebot3_description/share/turtlebot3_description/urdf/turtlebot3_waffle.urdf; do
    if [ -f "$path" ]; then
        URDF_FILE="$path"
        break
    fi
done

if [ -n "$URDF_FILE" ]; then
    for i in $(seq 0 $((NUM_ROBOTS-1))); do
        ros2 run robot_state_publisher robot_state_publisher \
            --ros-args -r __node:=rsp_tb3_$i \
                       -r __ns:=/tb3_$i \
                       -p frame_prefix:=tb3_$i/ \
            -- "$URDF_FILE" &
    done
    sleep 1
    echo "  $NUM_ROBOTS robot_state_publisher instances running"
else
    echo "  WARNING: TurtleBot3 URDF not found — 3D model viewer will not work"
fi

# 5. rosbridge WebSocket server
echo "[5/6] Starting rosbridge_websocket on port 9090..."
ros2 launch rosbridge_server rosbridge_websocket_launch.xml &
ROSBRIDGE_PID=$!
sleep 2
echo "  rosbridge running (PID: $ROSBRIDGE_PID)"

# 6. Summary
echo ""
echo "============================================"
echo "  ROSViz Web — Simulation Stack Running"
echo "============================================"
echo ""
echo "  Ignition Gazebo:      PID $IGN_PID"
echo "  ros_gz_bridge:        PID $BRIDGE_PID"
echo "  Image compressor:     PID $COMPRESSOR_PID"
[ -n "$RSP_PID" ] && echo "  robot_state_publisher: PID $RSP_PID"
echo "  rosbridge:            PID $ROSBRIDGE_PID"
echo ""
echo "ROS 2 topics:"
ros2 topic list 2>/dev/null || true
echo ""
echo "Now run the dashboard:  npm run dev"
echo "Open http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all processes"

# Cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $ROSBRIDGE_PID 2>/dev/null || true
    [ -n "$RSP_PID" ] && kill $RSP_PID 2>/dev/null || true
    kill $COMPRESSOR_PID 2>/dev/null || true
    kill $BRIDGE_PID 2>/dev/null || true
    kill $IGN_PID 2>/dev/null || true
    wait 2>/dev/null
    echo "All processes stopped."
}
trap cleanup EXIT INT TERM

wait
