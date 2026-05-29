# ROSViz Web

ROSViz Web is a real-time dashboard for simulated ROS 2 TurtleBot3 fleets.
It combines a Next.js web UI, rosbridge, ROS 2 Humble, Ignition Gazebo
Fortress, Prometheus, and Grafana into one Docker Compose stack.

The default stack starts three namespaced TurtleBot3 Waffle robots:

- `/tb3_0`
- `/tb3_1`
- `/tb3_2`

The dashboard can discover robots, show live camera/depth streams, display
telemetry, switch active robots, publish velocity commands, render maps and
point clouds, and surface alert history from the ROS alert monitor.

![ROS 2](https://img.shields.io/badge/ROS_2-Humble-blue)
![Gazebo](https://img.shields.io/badge/Gazebo-Fortress-orange)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-20-green)

## Demo

The repository includes an older single-robot capture of the dashboard:

![ROSViz Web demo](docs/rosviz_singleBot.gif)

## What Runs

`docker compose up --build` starts these services:

| Service | Port | Purpose |
| --- | --- | --- |
| `ros-stack` | `9090` | ROS 2 Humble, Ignition Gazebo, ros_gz_bridge, rosbridge, TF publishers, image compressor, muxes, alert monitor, point-cloud aggregator |
| `dashboard` | `3000` | Next.js dashboard |
| `prometheus` | `9091` | Metrics scrape and alert-rule evaluation |
| `grafana` | `3001` | Robot alert dashboard and notification routing |

Default Grafana login:

```text
admin / admin
```

Change credentials in `.env` before exposing the stack outside localhost.

## Architecture

Gazebo publishes robot sensor data through `ros_gz_bridge`. Browser clients
connect through rosbridge over WebSocket. Monitoring data is produced by the
ROS alert monitor and scraped by Prometheus.

```text
Ignition Gazebo
  |
  | per-robot topics: /tb3_<id>/odom, /scan, /imu, /camera, /cmd_vel
  v
ros_gz_bridge + robot_state_publisher
  |
  +--> rosbridge :9090 -----------------> Next.js dashboard :3000
  |
  +--> alert_monitor_node.py :8888 -----> Prometheus :9091 -----> Grafana :3001
  |
  +--> pointcloud_aggregator.py --------> /common/scan/points
```

## Features

- Fleet overview with robot discovery from ROS topics
- Per-robot dashboard routes at `/robot/tb3_<id>`
- Common fleet view at `/common`
- Live RGB and depth camera streams
- Real-time odometry, IMU, battery, and velocity telemetry
- TurtleBot3 controls that publish namespaced `/tb3_<id>/cmd_vel`
- Robot selector with mux switching for selected scan/camera feeds
- Shared `/tf` and `/tf_static` tree with namespaced robot frames
- 2D Leaflet map with robot markers
- Three.js point cloud viewer
- Server-side point cloud aggregation to `/common/scan/points`
- Alert history panel with filtering, acknowledgment, auto-stop toggle, and Grafana link
- Prometheus and Grafana provisioning for robot alert metrics
- Optional Tauri desktop app scaffold

## Quick Start

### Requirements

- Docker Engine 20+
- Docker Compose v2+
- Chrome, Chromium, Firefox, or another modern browser

### Run the Full Stack

```bash
git clone https://github.com/prakash-aryan/rosviz-web.git
cd rosviz-web

# Optional: edit runtime settings first.
cp .env.example .env

docker compose up -d --build
```

Open:

- Dashboard: http://localhost:3000
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9091
- rosbridge WebSocket: ws://localhost:9090

Check service health:

```bash
docker compose ps
docker compose logs -f ros-stack
```

Stop the stack:

```bash
docker compose down
```

Remove persistent monitoring/alert data too:

```bash
docker compose down -v
```

## Rendering Modes

The default stack is headless CPU rendering. GPU overrides are available for
hosts that have the required drivers and permissions.

| Mode | Command | Notes |
| --- | --- | --- |
| CPU | `docker compose up -d --build` | Default. Uses software rendering. |
| AMD GPU | `docker compose -f docker-compose.yml -f docker-compose.amdgpu.yml up -d --build` | Uses `/dev/dri`; check `video` and `render` group IDs in the override file. |
| NVIDIA GPU | `docker compose -f docker-compose.yml -f docker-compose.nvidia.yml up -d --build` | Requires NVIDIA Container Toolkit. Supports launching the Gazebo GUI through X11. |

For NVIDIA GUI use:

```bash
xhost +local:root
docker exec -d rosviz-ros bash -lc "source /opt/ros/humble/setup.bash && ign gazebo -g"
```

## Configuration

Copy `.env.example` to `.env` and edit values before starting Compose.

Important settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `TURTLEBOT3_MODEL` | `waffle` | TurtleBot3 model used by the simulation and alert footprint logic |
| `NUM_ROBOTS` | `3` | Number of simulated robots |
| `ALERT_HISTORY_FILE` | `/data/alert_history.json` | Alert history persistence path inside `ros-stack` |
| `PROMETHEUS_RETENTION` | `30d` | Prometheus metric retention |
| `GRAFANA_ADMIN_USER` | `admin` | Grafana admin user |
| `GRAFANA_ADMIN_PASSWORD` | `admin` | Grafana admin password |
| `DISCORD_WEBHOOK_URL` | empty | Optional Grafana Discord contact point |

Alert thresholds are also configured in `.env.example`, including collision,
velocity, battery, IMU, stall, geofence, motor overload, and wheel-slip limits.

## ROS Topic Model

Most robot-specific topics are namespaced by robot id:

```text
/tb3_<id>/odom
/tb3_<id>/scan
/tb3_<id>/scan/points
/tb3_<id>/imu
/tb3_<id>/battery_state
/tb3_<id>/cmd_vel
/tb3_<id>/camera/image_raw
/tb3_<id>/camera/image_raw/compressed
/tb3_<id>/camera/depth/image_rect_raw
/tb3_<id>/camera/depth/image_rect_raw/compressed
/tb3_<id>/robot_description
```

Shared topics:

| Topic | Type | Purpose |
| --- | --- | --- |
| `/tf` | `tf2_msgs/TFMessage` | Shared transform stream with namespaced frames |
| `/tf_static` | `tf2_msgs/TFMessage` | Static transforms |
| `/common/scan/points` | `sensor_msgs/PointCloud2` | Aggregated fleet point cloud in `world` frame |
| `/selected/scan_points` | `sensor_msgs/PointCloud2` | Muxed point cloud for selected robot |
| `/selected/camera_image` | `sensor_msgs/CompressedImage` | Muxed RGB camera feed |
| `/selected/camera_depth` | `sensor_msgs/CompressedImage` | Muxed depth camera feed |
| `/robot_alerts` | `std_msgs/String` | Live alert stream |
| `/robot_alerts_history` | `std_msgs/String` | Alert history snapshots |
| `/robot_alerts_request_history` | `std_msgs/String` | History request trigger |
| `/safety_auto_stop` | `std_msgs/Bool` | Enable or disable critical-alert auto-stop |

Robot selection uses these mux services:

```text
/mux_scan_points/select
/mux_camera_image/select
/mux_camera_depth/select
```

## Alerting and Monitoring

`scripts/alert_monitor_node.py` evaluates robot health and safety conditions.
It publishes alerts to ROS topics, keeps a persistent alert history, exposes
Prometheus metrics on port `8888` inside the `ros-stack` container, and supports
Grafana alerting.

Alert categories include:

- `COLLISION`
- `VELOCITY_EXCEEDED`
- `CONNECTION_LOSS`
- `LOW_BATTERY`
- `IMPACT_DETECTED`
- `TILT_WARNING`
- `MOTOR_STALL`
- `GEOFENCE_BREACH`
- `BATTERY_FAULT`
- `MOTOR_OVERLOAD`
- `VERTICAL_SHOCK`
- `WHEEL_SLIP`

Inject synthetic alerts for testing:

```bash
docker exec rosviz-ros python3 /ros_ws/scripts/inject_test_alerts.py --all
docker exec rosviz-ros python3 /ros_ws/scripts/inject_test_alerts.py --type COLLISION --robot-id 1
```

Check Prometheus scrape status:

```bash
curl http://localhost:9091/api/v1/targets
```

## Development

### Frontend Only

The project has both `package-lock.json` and `pnpm-lock.yaml`. The current
package metadata declares pnpm, while the Docker dashboard image uses npm.

```bash
pnpm install
pnpm run dev
```

The dashboard expects rosbridge at `ws://localhost:9090`.

Useful checks:

```bash
pnpm run lint
pnpm run build
```

### Docker Hot Reload

Compose bind-mounts these directories:

| Path | Effect |
| --- | --- |
| `src/`, `public/` | Next.js hot reloads in the dashboard container |
| `simulation/`, `scripts/` | Restart `ros-stack` after edits |
| `docker/`, `package.json`, lockfiles | Rebuild images |

Common commands:

```bash
docker compose restart ros-stack
docker compose up -d --build dashboard
docker compose up -d --build ros-stack
```

### Tauri Desktop App

Install Tauri prerequisites and Rust, then run:

```bash
pnpm install
pnpm run tauri dev
```

Build desktop packages:

```bash
pnpm run tauri build
```

## Project Structure

```text
rosviz-web/
├── docker/
│   ├── Dockerfile.dashboard
│   ├── Dockerfile.ros
│   └── ros-entrypoint.sh
├── docker-compose.yml
├── docker-compose.amdgpu.yml
├── docker-compose.nvidia.yml
├── monitoring/
│   ├── grafana/
│   └── prometheus/
├── public/
│   └── meshes/turtlebot3/
├── scripts/
│   ├── alert_monitor_node.py
│   ├── debug_utils.py
│   ├── image_compressor.py
│   ├── inject_test_alerts.py
│   └── pointcloud_aggregator.py
├── simulation/
│   ├── models/
│   └── worlds/
├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── types/
├── src-tauri/
├── package.json
└── README.md
```

## Troubleshooting

### Dashboard Cannot Connect To ROS

Check that `ros-stack` is running and port `9090` is exposed:

```bash
docker compose ps
docker compose logs ros-stack
```

The dashboard connects to `ws://localhost:9090` by default.

### Robots Are Not Discovered

Verify namespaced topics are present:

```bash
docker compose exec ros-stack bash -lc \
  "source /opt/ros/humble/setup.bash && ros2 topic list | grep '^/tb3_'"
```

### No Camera Feed

Check raw and compressed image topics:

```bash
docker compose exec ros-stack bash -lc \
  "source /opt/ros/humble/setup.bash && ros2 topic list | grep camera"
```

### Point Cloud Is Empty Or Delayed

Check the aggregated topic:

```bash
docker compose exec ros-stack bash -lc \
  "source /opt/ros/humble/setup.bash && ros2 topic echo /common/scan/points --once"
```

The aggregator may skip publishes while waiting for synchronized transforms or
fresh point clouds. Look at:

```bash
docker compose logs ros-stack | grep pointcloud_aggregator
```

### Grafana Shows No Data

Open `http://localhost:9091/targets` and verify the `ros-stack` target is up.

Also check:

```bash
docker compose logs prometheus
docker compose logs grafana
```

### Alert History Is Empty After Restart

Alert history is stored in the `alert-data` Docker volume. Verify the file:

```bash
docker exec rosviz-ros cat /data/alert_history.json
```

## Contributors

| Contributor | Email |
| --- | --- |
| Tom Marti | tom.marti@students.unibe.ch |
| Anouk Martinez | anouk.martinezwieczorek@unifr.ch |
| Antonio Aparicio | antonio.apariciogonzalez@students.unibe.ch |
| Andrew Mullen | Andrew.mullen@unine.ch |
| Felix Merz | felix.merz@students.unibe.ch |
| Alessandra Gorini | alessandra.gorini@unine.ch |

## License

[MIT](LICENSE)
