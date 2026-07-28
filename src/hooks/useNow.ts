import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * A clock that ticks on an interval and, crucially, re-syncs the moment the
 * app returns to the foreground. JS timers are throttled or suspended while
 * backgrounded, so a countdown driven by a naive setInterval comes back
 * minutes behind.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);

    const subscription = AppState.addEventListener('change', (next) => {
      if (
        appState.current.match(/inactive|background/) &&
        next === 'active'
      ) {
        setNow(new Date());
      }
      appState.current = next;
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [intervalMs]);

  return now;
}
