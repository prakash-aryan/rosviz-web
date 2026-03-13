#!/usr/bin/env python3
"""Compress raw images from /camera/image_raw and publish to /camera/image_raw/compressed"""

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CompressedImage
import cv2
import numpy as np


class ImageCompressor(Node):
    def __init__(self):
        super().__init__('image_compressor')
        self.sub = self.create_subscription(Image, '/camera/image_raw', self.callback, 1)
        self.pub = self.create_publisher(CompressedImage, '/camera/image_raw/compressed', 1)
        self.skip = 0
        self.get_logger().info('Image compressor started')

    def callback(self, msg):
        # Only process every 3rd frame to reduce CPU
        self.skip += 1
        if self.skip % 3 != 0:
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
            self.pub.publish(comp_msg)
        except Exception as e:
            self.get_logger().error(f'Error: {e}')


def main():
    rclpy.init()
    node = ImageCompressor()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
