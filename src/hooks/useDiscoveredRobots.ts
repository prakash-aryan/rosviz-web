import { useState, useEffect } from "react";
import rosbridge from "@/lib/rosbridge";
import { useROS } from "./useROS";

interface TopicsResponse {
  topics: string[];
  types?: string[];
}

const ROBOT_PREFIX_REGEX = /^\/tb3_(\d+)\//;
const POLL_INTERVAL_MS = 5000;

/**
 * Discover the set of robots currently publishing on rosbridge.
 *
 * Calls /rosapi/topics, looks at every topic name, and extracts the
 * integer N from any topic matching /tb3_<N>/...
 *
 * Returns a sorted array of unique robot ids. Re-polls every 5s while
 * connected so the list reflects robots that join or leave.
 */
export function useDiscoveredRobots(): number[] {
  const { isConnected } = useROS();
  const [robotIds, setRobotIds] = useState<number[]>([]);

  useEffect(() => {
    if (!isConnected) {
      setRobotIds([]);
      return;
    }

    let cancelled = false;

    const discover = async () => {
      try {
        const response = await rosbridge.callService<Record<string, never>, TopicsResponse>(
          "/rosapi/topics",
          "rosapi/Topics",
          {},
          5000,
        );

        const ids = new Set<number>();
        for (const topic of response.topics ?? []) {
          const match = topic.match(ROBOT_PREFIX_REGEX);
          if (match) {
            ids.add(Number(match[1]));
          }
        }

        if (!cancelled) {
          const sorted = [...ids].sort((a, b) => a - b);
          setRobotIds((prev) => {
            // Avoid unnecessary re-renders if the list is unchanged
            if (
              prev.length === sorted.length &&
              prev.every((v, i) => v === sorted[i])
            ) {
              return prev;
            }
            return sorted;
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[useDiscoveredRobots] discovery failed:", err);
        }
      }
    };

    discover();
    const interval = setInterval(discover, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isConnected]);

  return robotIds;
}

export default useDiscoveredRobots;
