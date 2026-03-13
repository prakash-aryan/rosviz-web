'use client';

import React from 'react';
import PointCloudViewer from './PointCloudViewer';

const PointCloud = () => {
  return <PointCloudViewer topic="/scan/points" />;
};

export default PointCloud;