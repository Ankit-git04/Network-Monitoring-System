import { useEffect, useRef, useCallback } from 'react';

export function usePolling(callback, interval = 5000, immediate = true) {
  const savedCallback = useRef(callback);
  const timerRef = useRef(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const start = useCallback(() => {
    if (immediate) savedCallback.current();
    timerRef.current = setInterval(() => savedCallback.current(), interval);
    return () => clearInterval(timerRef.current);
  }, [interval, immediate]);

  useEffect(() => {
    const cleanup = start();
    return cleanup;
  }, [start]);
}
