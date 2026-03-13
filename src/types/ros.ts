export type ROSCallback<T> = (message: T) => void;

export interface ROSMessageBase {
  op: string;
  topic?: string;
  type?: string;
}

export interface ROSMessage extends ROSMessageBase {
  msg?: ROSMessageData;
}

export interface ROSMessageData {
  data?: Uint8Array | string | number[];
  encoding?: string;
  [key: string]: any;
}

export interface ROSImageMessage extends ROSMessageData {
  header: {
    seq: number;
    stamp: {
      secs: number;
      nsecs: number;
    };
    frame_id: string;
  };
  height: number;
  width: number;
  encoding: string;
  is_bigendian: number;
  step: number;
  data: Uint8Array | string | number[];
}

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Pose {
  position: Point;
  orientation: Quaternion;
}

export interface Odometry {
  header: {
    seq: number;
    stamp: {
      secs: number;
      nsecs: number;
    };
    frame_id: string;
  };
  child_frame_id: string;
  pose: {
    pose: Pose;
    covariance: number[];
  };
  twist: {
    twist: {
      linear: Point;
      angular: Point;
    };
    covariance: number[];
  };
}