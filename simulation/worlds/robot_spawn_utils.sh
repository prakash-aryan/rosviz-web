#!/bin/bash


# get_robot_spawn_pose <robot_id>
#
# Generates a deterministic spawn pose for a robot in the Gazebo world.
#
# Robots are arranged in a 3-column grid around the origin to:
# - avoid spawn collisions
# - keep robots visible in fleet views
# - maintain stable namespace-to-position mapping
#
# Initial yaw rotations are also varied to reduce identical viewpoints.
#
# Example layout:
#
#   tb3_0 -> (-1,  0)
#   tb3_1 -> ( 0,  0)
#   tb3_2 -> ( 1,  0)
#   tb3_3 -> (-1, -1)
#   tb3_4 -> ( 0, -1)
#   tb3_5 -> ( 1, -1)
#
# Output format: "<x> <y> <z> <yaw>"
#

get_robot_spawn_pose() {

    local robot_id="$1"

    local x=$(( (robot_id % 3) - 1 ))

    local y=$(( robot_id / 3 ))

    y=$(( y * -1 ))

    local yaw="0"

    case $((robot_id % 4)) in
        1) yaw="1.5708" ;;
        2) yaw="3.1416" ;;
        3) yaw="-1.5708" ;;
    esac

    echo "$x $y 0.01 $yaw"
}
