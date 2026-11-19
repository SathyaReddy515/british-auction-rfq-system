import { useState, useEffect } from 'react';

interface CountdownResult {
  formattedTime: string;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  isInTriggerWindow: boolean;
  forcedTimeFormatted: string;
  isForcedExpired: boolean;
}

export const useCountdown = (
  closeTimeStr?: string,
  forcedTimeStr?: string,
  triggerWindowMinutes: number = 10
): CountdownResult => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!closeTimeStr) {
    return {
      formattedTime: '--:--:--',
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: false,
      isInTriggerWindow: false,
      forcedTimeFormatted: '--:--:--',
      isForcedExpired: false,
    };
  }

  const closeTime = new Date(closeTimeStr).getTime();
  const forcedTime = forcedTimeStr ? new Date(forcedTimeStr).getTime() : closeTime;

  const diffMs = Math.max(0, closeTime - now);
  const forcedDiffMs = Math.max(0, forcedTime - now);

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const forcedTotalSec = Math.floor(forcedDiffMs / 1000);
  const forcedHours = Math.floor(forcedTotalSec / 3600);
  const forcedMinutes = Math.floor((forcedTotalSec % 3600) / 60);
  const forcedSec = forcedTotalSec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  const formattedTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const forcedTimeFormatted = `${pad(forcedHours)}:${pad(forcedMinutes)}:${pad(forcedSec)}`;

  const isExpired = diffMs <= 0;
  const isForcedExpired = forcedDiffMs <= 0;

  // Trigger window check: current time is within [closeTime - X mins, closeTime)
  const triggerWindowMs = triggerWindowMinutes * 60 * 1000;
  const isInTriggerWindow = !isExpired && diffMs <= triggerWindowMs;

  return {
    formattedTime,
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired,
    isInTriggerWindow,
    forcedTimeFormatted,
    isForcedExpired,
  };
};
