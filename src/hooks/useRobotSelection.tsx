'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import rosbridge from '@/lib/rosbridge';

const STORAGE_KEY = 'rosviz.selectedRobotId';
const MUX_SELECT_SERVICE_TYPE = 'topic_tools_interfaces/srv/MuxSelect';

interface MuxConfig {
  service: string;
  inputForRobot: (id: number) => string;
}

const MUXES: MuxConfig[] = [
  {
    service: '/mux_scan_points/select',
    inputForRobot: (id) => `/tb3_${id}/scan/points`,
  },
  {
    service: '/mux_camera_image/select',
    inputForRobot: (id) => `/tb3_${id}/camera/image_raw/compressed`,
  },
  {
    service: '/mux_camera_depth/select',
    inputForRobot: (id) => `/tb3_${id}/camera/depth/image_rect_raw/compressed`,
  },
];

function readPersistedSelection(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

function persistSelection(id: number | null) {
  if (typeof window === 'undefined') return;
  if (id === null) {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(STORAGE_KEY, String(id));
  }
}

interface RobotSelectionContextValue {
  selectedRobotId: number | null;
  isSwitchingRobot: boolean;
  selectRobot: (id: number) => Promise<boolean>;
}

const RobotSelectionContext = createContext<RobotSelectionContextValue | null>(null);

export function RobotSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedRobotId, setSelectedRobotId] = useState<number | null>(null);
  const [isSwitchingRobot, setIsSwitchingRobot] = useState(false);

  const requestIdRef = useRef(0);
  const activeTargetRef = useRef<number | null>(null);
  const didInitRef = useRef(false);
  const skipNextPersistRef = useRef(true);

  useEffect(() => {
    setSelectedRobotId(readPersistedSelection());
    didInitRef.current = true;
  }, []);

  useEffect(() => {
    if (!didInitRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    persistSelection(selectedRobotId);
  }, [selectedRobotId]);

  const selectRobot = useCallback(async (id: number): Promise<boolean> => {
    // Idempotent short-circuit.
    if (selectedRobotId === id) return true;
    // Prevent duplicate in-flight request to the same target.
    if (isSwitchingRobot && activeTargetRef.current === id) return false;

    const requestId = ++requestIdRef.current;
    activeTargetRef.current = id;
    setIsSwitchingRobot(true);

    try {
      if (!rosbridge.isConnected()) {
        await rosbridge.connect();
      }

      const results = await Promise.allSettled(
        MUXES.map((mux) =>
          rosbridge.callService(
            mux.service,
            MUX_SELECT_SERVICE_TYPE,
            { topic: mux.inputForRobot(id) },
            3000,
          ),
        ),
      );

      if (requestId !== requestIdRef.current) {
        console.warn(`[useRobotSelection] Ignoring stale robot switch request for robot ${id}`);
        return false;
      }

      const failures = results
        .map((result, index) =>
          result.status === 'rejected'
            ? {
                mux: MUXES[index].service,
                reason: result.reason,
              }
            : null,
        )
        .filter((failure): failure is { mux: string; reason: unknown } => failure !== null);

      if (failures.length > 0) {
        console.warn(
          `[useRobotSelection] ${failures.length}/${MUXES.length} mux switches failed`,
          failures,
        );
        return false;
      }

      setSelectedRobotId(id);
      return true;
    } catch (error) {
      console.warn('[useRobotSelection] Robot switch unavailable', error);
      return false;
    } finally {
      if (requestId === requestIdRef.current) {
        activeTargetRef.current = null;
        setIsSwitchingRobot(false);
      }
    }
  }, [selectedRobotId, isSwitchingRobot]);

  const value = useMemo<RobotSelectionContextValue>(
    () => ({
      selectedRobotId,
      isSwitchingRobot,
      selectRobot,
    }),
    [selectedRobotId, isSwitchingRobot, selectRobot],
  );

  return <RobotSelectionContext.Provider value={value}>{children}</RobotSelectionContext.Provider>;
}

export function useRobotSelection() {
  const ctx = useContext(RobotSelectionContext);
  if (!ctx) {
    throw new Error('useRobotSelection must be used within RobotSelectionProvider');
  }
  return ctx;
}

export default useRobotSelection;
