#!/usr/bin/env python3
"""Compress raw RGB and depth images to JPEG for the dashboard.

- /camera/image_raw          -> /camera/image_raw/compressed                (JPEG)
- /camera/depth/image_rect_raw -> /camera/depth/image_rect_raw/compressed   (JPEG, colorized)
"""

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CompressedImage
import cv2
import numpy as np


DEPTH_MIN_M = 0.1
DEPTH_MAX_M = 5.0


class ImageCompressor(Node):
    def __init__(self):
        super().__init__('image_compressor')

        self.rgb_sub = self.create_subscription(
            Image, '/camera/image_raw', self.rgb_callback, 1)
        self.rgb_pub = self.create_publisher(
            CompressedImage, '/camera/image_raw/compressed', 1)

        self.depth_sub = self.create_subscription(
            Image, '/camera/depth/image_rect_raw', self.depth_callback, 1)
        self.depth_pub = self.create_publisher(
            CompressedImage, '/camera/depth/image_rect_raw/compressed', 1)

        self.rgb_skip = 0
        self.depth_skip = 0
        self.get_logger().info('Image compressor started (RGB + depth)')

    def rgb_callback(self, msg):
        self.rgb_skip += 1
        if self.rgb_skip % 3 != 0:
            return
        try:
            if msg.encoding == 'rgb8':
                img = np.frombuffer(msg.data, dtype=np.uint8).reshape(msg.height, msg.width, 3)
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            elif msg.encoding == 'bgr8':
                img = np.frombuffer(msg.data, dtype=np.uint8).reshape(msg.height, msg.width, 3)
            else:
                self.get_logger().warn(f'Unsupported RGB encoding: {msg.encoding}')
                return
            _, jpeg = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 50])
            out = CompressedImage()
            out.header = msg.header
            out.format = 'jpeg'
            out.data = jpeg.tobytes()
            self.rgb_pub.publish(out)
        except Exception as e:
            self.get_logger().error(f'RGB error: {e}')

    def depth_callback(self, msg):
        self.depth_skip += 1
        if self.depth_skip % 3 != 0:
            return
        try:
            if msg.encoding in ('32FC1', 'FC32'):
                depth = np.frombuffer(msg.data, dtype=np.float32).reshape(msg.height, msg.width)
            elif msg.encoding == '16UC1':
                depth = np.frombuffer(msg.data, dtype=np.uint16).reshape(msg.height, msg.width).astype(np.float32) * 0.001
            else:
                self.get_logger().warn(f'Unsupported depth encoding: {msg.encoding}')
                return

            depth = np.nan_to_num(depth, nan=0.0, posinf=0.0, neginf=0.0)
            clipped = np.clip(depth, DEPTH_MIN_M, DEPTH_MAX_M)
            norm = ((clipped - DEPTH_MIN_M) / (DEPTH_MAX_M - DEPTH_MIN_M) * 255.0).astype(np.uint8)
            colored = cv2.applyColorMap(norm, cv2.COLORMAP_TURBO)
            # Paint invalid pixels (depth == 0) as black
            colored[depth <= 0] = 0

            _, jpeg = cv2.imencode('.jpg', colored, [cv2.IMWRITE_JPEG_QUALITY, 60])
            out = CompressedImage()
            out.header = msg.header
            out.format = 'jpeg'
            out.data = jpeg.tobytes()
            self.depth_pub.publish(out)
        except Exception as e:
            self.get_logger().error(f'Depth error: {e}')


def main():
    rclpy.init()
    node = ImageCompressor()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
