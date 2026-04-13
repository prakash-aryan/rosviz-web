#!/bin/bash
# Usage: ./generate_robots.sh 3   (creates tb3_0, tb3_1, tb3_2)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/turtlebot3_waffle"
N=${1:-2}

for i in $(seq 0 $((N-1))); do
    OUT="$SCRIPT_DIR/turtlebot3_waffle_$i"
    rm -rf "$OUT"
    cp -r "$TEMPLATE" "$OUT"
    # Replace tb3_0 with tb3_$i in the SDF and config
    sed -i "s/tb3_0/tb3_$i/g; s/turtlebot3_waffle_0/turtlebot3_waffle_$i/g" "$OUT/model.sdf"
    sed -i "s/turtlebot3_waffle/turtlebot3_waffle_$i/g" "$OUT/model.config"
    echo "Generated turtlebot3_waffle_$i"
done