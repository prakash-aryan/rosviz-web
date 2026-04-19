#!/usr/bin/env python3
"""Compress raw images from /camera/image_raw and publish to /camera/image_raw/compressed"""

import os

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CompressedImage
import cv2
import numpy as np


class ImageCompressor(Node):
    def __init__(self, num_robots):
        super().__init__('image_compressor')
        self.subs = []
        self.pubs = {}
        self.skips = {}
        for i in range(num_robots):
            ns = f'tb3_{i}'
            in_topic = f'/{ns}/camera/image_raw'
            out_topic = f'/{ns}/camera/image_raw/compressed'
            self.subs.append(self.create_subscription(
                Image, in_topic, lambda msg, n=ns: self.callback(msg, n), 1))
            self.pubs[ns] = self.create_publisher(CompressedImage, out_topic, 1)
            self.skips[ns] = 0
        self.get_logger().info(f'Image compressor started for {num_robots} robots')

    def callback(self, msg, ns):
        # Only process every 3rd frame to reduce CPU     
        self.skips[ns] += 1
        if self.skips[ns] % 3 != 0:
            return


        try:
            # Convert ROS Image to numpy array
            if msg.encoding == 'rgb8':
                img = np.frombuffer(msg.data, dtype=np.uint8).reshape(msg.height, msg.width, 3)
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            elif msg.encoding == 'bgr8':
                img = np.frombuffer(msg.data, dtype=np.uint8).reshape(msg.height, msg.width, 3)
            else:
                self.get_logger().warn(f'Unsupported encoding: {msg.encoding}')
                return

            # Compress to JPEG
            _, jpeg = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 50])

            # Publish compressed image
            comp_msg = CompressedImage()
            comp_msg.header = msg.header
            comp_msg.format = 'jpeg'
            comp_msg.data = jpeg.tobytes()
            self.pubs[ns].publish(comp_msg)
        except Exception as e:
            self.get_logger().error(f'Error: {e}')


def main():
    rclpy.init()
    n = int(os.environ.get('NUM_ROBOTS', '2'))
    node = ImageCompressor(n)
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
