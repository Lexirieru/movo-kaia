"use client";

import { useCallback, useRef } from "react";

interface UseRefetchOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

export const useRefetch = (options: UseRefetchOptions = {}) => {
  const { refetchInterval = 30000, enabled = true } = options;
  // eslint-disable-next-line no-undef
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const refetchFunctionsRef = useRef<Set<() => void>>(new Set());

  const addRefetchFunction = useCallback((refetchFn: () => void) => {
    refetchFunctionsRef.current.add(refetchFn);
  }, []);

  const removeRefetchFunction = useCallback((refetchFn: () => void) => {
    refetchFunctionsRef.current.delete(refetchFn);
  }, []);

  const triggerRefetch = useCallback(() => {
    refetchFunctionsRef.current.forEach((refetchFn) => {
      refetchFn();
    });
  }, []);

  const startAutoRefetch = useCallback(() => {
    if (!enabled) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      triggerRefetch();
    }, refetchInterval);
  }, [enabled, refetchInterval, triggerRefetch]);

  const stopAutoRefetch = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const manualRefetch = useCallback(() => {
    triggerRefetch();
  }, [triggerRefetch]);

  return {
    addRefetchFunction,
    removeRefetchFunction,
    triggerRefetch,
    startAutoRefetch,
    stopAutoRefetch,
    manualRefetch,
  };
};
