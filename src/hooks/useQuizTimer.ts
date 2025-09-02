import { useState, useEffect, useCallback } from 'react';

interface UseQuizTimerProps {
  initialTime: number;
  onTimeExpired: () => void;
  onTimeUpdate: (timeLeft: number) => void;
}

export function useQuizTimer({ initialTime, onTimeExpired, onTimeUpdate }: UseQuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [timerActive, setTimerActive] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [hasTimeExpired, setHasTimeExpired] = useState(false);

  // Timer effect - keep a stable interval even if onTimeUpdate/onTimeExpired identities change
  const onUpdateRef = useRef(onTimeUpdate);
  const onExpiredRef = useRef(onTimeExpired);
  useEffect(() => { onUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);
  useEffect(() => { onExpiredRef.current = onTimeExpired; }, [onTimeExpired]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (timerActive) {
      interval = setInterval(() => {
        setTimeLeft(prevTimeLeft => {
          const newTimeLeft = prevTimeLeft - 1;
          // Use refs to avoid effect retriggering each render
          onUpdateRef.current(newTimeLeft);
          if (newTimeLeft <= 0) {
            setTimerActive(false);
            setHasTimeExpired(true);
            onExpiredRef.current();
          }
          return Math.max(0, newTimeLeft);
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [timerActive]);

  const startTimer = useCallback(() => {
    if (!timerStarted && !hasTimeExpired) {
      setTimerActive(true);
      setTimerStarted(true);
    }
  }, [timerStarted, hasTimeExpired]);

  const resetTimer = useCallback((newTime: number) => {
    setTimeLeft(newTime);
    setTimerActive(false);
    setTimerStarted(false);
    setHasTimeExpired(false);
  }, []);

  const stopTimer = useCallback(() => {
    setTimerActive(false);
  }, []);

  const setTimerActiveState = useCallback((active: boolean) => {
    setTimerActive(active);
  }, []);

  const setTimerStartedState = useCallback((started: boolean) => {
    setTimerStarted(started);
  }, []);

  return {
    timeLeft,
    timerActive,
    timerStarted,
    hasTimeExpired,
    startTimer,
    resetTimer,
    stopTimer,
    setHasTimeExpired,
    setTimerActiveState,
    setTimerStartedState
  };
}