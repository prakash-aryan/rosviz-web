#!/bin/bash
# =============================================================
#  ROSViz Web — ROS Stack Entrypoint
# =============================================================
#  Launches all ROS 2 / Gazebo processes in a single container.
#  Each process runs in the background; the script waits for all.
#  If any process exits, the container stops.
# =============================================================
set -e

# Source ROS 2
source /opt/ros/humble/setup.bash

echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │  ROSViz Web — ROS Stack                     │"
echo "  │  ROS 2    : humble                          │"
echo "  │  Gazebo   : Fortress (Ignition 6)           │"
echo "  │  Robot    : TurtleBot3 $TURTLEBOT3_MODEL             │"
echo "  └─────────────────────────────────────────────┘"
echo ""

# Track PIDs so we can wait and detect failures
PIDS=()

cleanup() {
    echo "[entrypoint] Shutting down all processes..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait
    echo "[entrypoint] All processes stopped."
}
trap cleanup SIGINT SIGTERM EXIT

# ─────────────────────────────────────────────
#  1. Ignition Gazebo (headless server)
# ─────────────────────────────────────────────
echo "[entrypoint] Starting Ignition Gazebo (headless)..."
ign gazebo -s -r /ros_ws/simulation/worlds/turtlebot3_world.sdf &
PIDS+=($!)
sleep 5  # Give Gazebo time to load the world

# ─────────────────────────────────────────────
#  2. ros_gz_bridge — Ignition <-> ROS 2 topics
# ─────────────────────────────────────────────
echo "[entrypoint] Starting ros_gz_bridge..."
ros2 run ros_gz_bridge parameter_bridge \
    /cmd_vel@geometry_msgs/msg/Twist]ignition.msgs.Twist \
    /odom@nav_msgs/msg/Odometry[ignition.msgs.Odometry \
    /tf@tf2_msgs/msg/TFMessage[ignition.msgs.Pose_V \
    /scan@sensor_msgs/msg/LaserScan[ignition.msgs.LaserScan \
    /imu@sensor_msgs/msg/Imu[ignition.msgs.IMU \
    /camera/image_raw@sensor_msgs/msg/Image[ignition.msgs.Image \
    /camera/camera_info@sensor_msgs/msg/CameraInfo[ignition.msgs.CameraInfo \
    /camera/depth/image_rect_raw@sensor_msgs/msg/Image[ignition.msgs.Image \
    /camera/depth/camera_info@sensor_msgs/msg/CameraInfo[ignition.msgs.CameraInfo \
    /camera/depth/image_rect_raw/points@sensor_msgs/msg/PointCloud2[ignition.msgs.PointCloudPacked \
    /joint_states@sensor_msgs/msg/JointState[ignition.msgs.Model \
    /scan/points@sensor_msgs/msg/PointCloud2[ignition.msgs.PointCloudPacked &
PIDS+=($!)
sleep 2

# ─────────────────────────────────────────────
#  3. Robot state publisher (URDF -> TF)
# ─────────────────────────────────────────────
echo "[entrypoint] Starting robot_state_publisher..."

# Get the URDF from the turtlebot3_description package
URDF_FILE="/opt/ros/humble/share/turtlebot3_description/urdf/turtlebot3_${TURTLEBOT3_MODEL}.urdf"

# If an xacro exists, process it; otherwise use the urdf directly
if [ -f "${URDF_FILE}.xacro" ]; then
    ROBOT_DESC=$(xacro "${URDF_FILE}.xacro")
elif [ -f "$URDF_FILE" ]; then
    ROBOT_DESC=$(cat "$URDF_FILE")
else
    echo "[entrypoint] WARNING: URDF not found at $URDF_FILE"
    echo "[entrypoint] robot_state_publisher will not be started."
    ROBOT_DESC=""
fi

if [ -n "$ROBOT_DESC" ]; then
    ros2 run robot_state_publisher robot_state_publisher \
        --ros-args \
        -p use_sim_time:=false \
        -p "robot_description:=$ROBOT_DESC" &
    PIDS+=($!)
    sleep 1
fi

# ─────────────────────────────────────────────
#  4. Image compressor (raw Image -> CompressedImage)
# ─────────────────────────────────────────────
echo "[entrypoint] Starting image compressor..."
python3 /ros_ws/scripts/image_compressor.py &
PIDS+=($!)
sleep 1

# ─────────────────────────────────────────────
#  5. rosbridge WebSocket server (port 9090)
# ─────────────────────────────────────────────
echo "[entrypoint] Starting rosbridge WebSocket on port 9090..."
ros2 launch rosbridge_server rosbridge_websocket_launch.xml &
PIDS+=($!)

echo ""
echo "[entrypoint] All processes started. PIDs: ${PIDS[*]}"
echo "[entrypoint] rosbridge WebSocket available at ws://0.0.0.0:9090"
echo ""

# ─────────────────────────────────────────────
#  Wait for any process to exit
# ─────────────────────────────────────────────
wait -n "${PIDS[@]}" 2>/dev/null
EXIT_CODE=$?
echo "[entrypoint] A process exited with code $EXIT_CODE. Stopping container."
exit $EXIT_CODE
