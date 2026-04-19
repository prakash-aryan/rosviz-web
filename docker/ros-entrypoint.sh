#!/bin/bash
# =============================================================
#  ROSViz Web — ROS Stack Entrypoint
# =============================================================
#  Launches all ROS 2 / Gazebo processes in a single container.
#  Each process runs in the background; the script waits for all.
#  If any process exits, the container stops.
# =============================================================
set -e
source /opt/ros/humble/setup.bash

# ── Multi-robot config ──
export NUM_ROBOTS=${NUM_ROBOTS:-3}
export IGN_GAZEBO_RESOURCE_PATH="/ros_ws/simulation/models:${IGN_GAZEBO_RESOURCE_PATH:-}"

echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │  ROSViz Web — ROS Stack                     │"
echo "  │  Robots   : $NUM_ROBOTS x TurtleBot3 $TURTLEBOT3_MODEL          │"
echo "  └─────────────────────────────────────────────┘"
echo ""

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

# ── 0. Generate per-robot model folders ──
echo "[entrypoint] Generating $NUM_ROBOTS robot model folders..."
bash /ros_ws/simulation/models/generate_robots.sh "$NUM_ROBOTS"

# ── 1. Ignition Gazebo ──
echo "[entrypoint] Starting Ignition Gazebo (headless)..."
ign gazebo -s -r /ros_ws/simulation/worlds/turtlebot3_world.sdf &
PIDS+=($!)
sleep 5

# ── 2. ros_gz_bridge — namespaced per robot ──
echo "[entrypoint] Starting ros_gz_bridge..."
BRIDGE_ARGS=""
for i in $(seq 0 $((NUM_ROBOTS-1))); do
    BRIDGE_ARGS="$BRIDGE_ARGS \
        /tb3_$i/cmd_vel@geometry_msgs/msg/Twist]ignition.msgs.Twist \
        /tb3_$i/odom@nav_msgs/msg/Odometry[ignition.msgs.Odometry \
        /tb3_$i/tf@tf2_msgs/msg/TFMessage[ignition.msgs.Pose_V \
        /tb3_$i/scan@sensor_msgs/msg/LaserScan[ignition.msgs.LaserScan \
        /tb3_$i/imu@sensor_msgs/msg/Imu[ignition.msgs.IMU \
        /tb3_$i/camera/image_raw@sensor_msgs/msg/Image[ignition.msgs.Image \
        /tb3_$i/camera/camera_info@sensor_msgs/msg/CameraInfo[ignition.msgs.CameraInfo \
        /tb3_$i/camera/depth/image_rect_raw@sensor_msgs/msg/Image[ignition.msgs.Image \
        /tb3_$i/camera/depth/camera_info@sensor_msgs/msg/CameraInfo[ignition.msgs.CameraInfo \
        /tb3_$i/camera/depth/image_rect_raw/points@sensor_msgs/msg/PointCloud2[ignition.msgs.PointCloudPacked \
        /tb3_$i/joint_states@sensor_msgs/msg/JointState[ignition.msgs.Model \
        /tb3_$i/scan/points@sensor_msgs/msg/PointCloud2[ignition.msgs.PointCloudPacked"
done
ros2 run ros_gz_bridge parameter_bridge $BRIDGE_ARGS &
PIDS+=($!)
sleep 2

# ── 3. robot_state_publisher — one per robot ──
echo "[entrypoint] Starting robot_state_publisher x $NUM_ROBOTS..."
URDF_FILE="/opt/ros/humble/share/turtlebot3_description/urdf/turtlebot3_${TURTLEBOT3_MODEL}.urdf"
if [ -f "$URDF_FILE" ]; then
    ROBOT_DESC=$(cat "$URDF_FILE")
    for i in $(seq 0 $((NUM_ROBOTS-1))); do
        ros2 run robot_state_publisher robot_state_publisher \
            --ros-args \
            -r __node:=rsp_tb3_$i \
            -r __ns:=/tb3_$i \
            -p use_sim_time:=false \
            -p frame_prefix:=tb3_$i/ \
            -p "robot_description:=$ROBOT_DESC" &
        PIDS+=($!)
    done
    sleep 1
else
    echo "[entrypoint] WARNING: URDF not found at $URDF_FILE"
fi

# ── 4. Image compressor (NUM_ROBOTS already exported) ──
echo "[entrypoint] Starting image compressor..."
python3 /ros_ws/scripts/image_compressor.py &
PIDS+=($!)
sleep 1

# ── 5. rosbridge ──
echo "[entrypoint] Starting rosbridge WebSocket on port 9090..."
ros2 launch rosbridge_server rosbridge_websocket_launch.xml &
PIDS+=($!)

echo ""
echo "[entrypoint] All processes started. PIDs: ${PIDS[*]}"
echo ""

wait -n "${PIDS[@]}" 2>/dev/null
EXIT_CODE=$?
echo "[entrypoint] A process exited with code $EXIT_CODE. Stopping container."
exit $EXIT_CODE