#!/usr/bin/env python3
"""Compress raw RGB and depth images to JPEG for the dashboard.

Creates one RGB + one depth pipeline per robot namespace (`/tb3_<i>/...`):
    /tb3_<i>/camera/image_raw              -> /tb3_<i>/camera/image_raw/compressed                (JPEG)
    /tb3_<i>/camera/depth/image_rect_raw   -> /tb3_<i>/camera/depth/image_rect_raw/compressed     (JPEG, colorized)
"""

import os

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CompressedImage
import cv2
import numpy as np


DEPTH_MIN_M = 0.1
DEPTH_MAX_M = 5.0


class ImageCompressor(Node):
    def __init__(self, num_robots):
        super().__init__('image_compressor')
        self.rgb_pubs = {}
        self.depth_pubs = {}
        self.rgb_skips = {}
        self.depth_skips = {}
        self.subs = []

        for i in range(num_robots):
            ns = f'tb3_{i}'
            self.rgb_pubs[ns] = self.create_publisher(
                CompressedImage, f'/{ns}/camera/image_raw/compressed', 1)
            self.depth_pubs[ns] = self.create_publisher(
                CompressedImage, f'/{ns}/camera/depth/image_rect_raw/compressed', 1)
            self.rgb_skips[ns] = 0
            self.depth_skips[ns] = 0
            self.subs.append(self.create_subscription(
                Image, f'/{ns}/camera/image_raw',
                lambda msg, n=ns: self.rgb_callback(msg, n), 1))
            self.subs.append(self.create_subscription(
                Image, f'/{ns}/camera/depth/image_rect_raw',
                lambda msg, n=ns: self.depth_callback(msg, n), 1))

        self.get_logger().info(
            f'Image compressor started for {num_robots} robot(s) (RGB + depth)')

    def rgb_callback(self, msg, ns):
        self.rgb_skips[ns] += 1
        if self.rgb_skips[ns] % 3 != 0:
            return
        try:
            if msg.encoding == 'rgb8':
                img = np.frombuffer(msg.data, dtype=np.uint8).reshape(msg.height, msg.width, 3)
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            elif msg.encoding == 'bgr8':
                img = np.frombuffer(msg.data, dtype=np.uint8).reshape(msg.height, msg.width, 3)
            else:
                self.get_logger().warn(f'[{ns}] Unsupported RGB encoding: {msg.encoding}')
                return
            _, jpeg = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 50])
            out = CompressedImage()
            out.header = msg.header
            out.format = 'jpeg'
            out.data = jpeg.tobytes()
            self.rgb_pubs[ns].publish(out)
        except Exception as e:
            self.get_logger().error(f'[{ns}] RGB error: {e}')

    def depth_callback(self, msg, ns):
        self.depth_skips[ns] += 1
        if self.depth_skips[ns] % 3 != 0:
            return
        try:
            if msg.encoding in ('32FC1', 'FC32'):
                depth = np.frombuffer(msg.data, dtype=np.float32).reshape(msg.height, msg.width)
            elif msg.encoding == '16UC1':
                depth = np.frombuffer(msg.data, dtype=np.uint16).reshape(msg.height, msg.width).astype(np.float32) * 0.001
            else:
                self.get_logger().warn(f'[{ns}] Unsupported depth encoding: {msg.encoding}')
                return

            depth = np.nan_to_num(depth, nan=0.0, posinf=0.0, neginf=0.0)
            clipped = np.clip(depth, DEPTH_MIN_M, DEPTH_MAX_M)
            norm = ((clipped - DEPTH_MIN_M) / (DEPTH_MAX_M - DEPTH_MIN_M) * 255.0).astype(np.uint8)
            colored = cv2.applyColorMap(norm, cv2.COLORMAP_TURBO)
            colored[depth <= 0] = 0

            _, jpeg = cv2.imencode('.jpg', colored, [cv2.IMWRITE_JPEG_QUALITY, 60])
            out = CompressedImage()
            out.header = msg.header
            out.format = 'jpeg'
            out.data = jpeg.tobytes()
            self.depth_pubs[ns].publish(out)
        except Exception as e:
            self.get_logger().error(f'[{ns}] Depth error: {e}')


def main():
    rclpy.init()
    n = int(os.environ.get('NUM_ROBOTS', '2'))
    node = ImageCompressor(n)
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
