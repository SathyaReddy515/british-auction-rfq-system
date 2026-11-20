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

export const parseUTC = (str?: string): number => {
  if (!str) return 0;
  let clean = str.trim();
  // If string does not specify timezone (no 'Z' and no +HH:MM / -HH:MM), append 'Z'
  // because all timestamps stored in our database are in UTC!
  if (!clean.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(clean) && !/[+-]\d{4}$/.test(clean)) {
    clean += 'Z';
  }
  const time = new Date(clean).getTime();
  return isNaN(time) ? 0 : time;
};

export const useCountdown = (
  closeTimeStr?: string,
  forcedTimeStr?: string,
  triggerWindowMinutes: number = 10,
  onExpire?: () => void
): CountdownResult => {
  const [now, setNow] = useState<number>(Date.now());
  const [hasTriggeredExpire, setHasTriggeredExpire] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset expire trigger if closeTime changes (e.g. after dynamic British Auction extension!)
  useEffect(() => {
    setHasTriggeredExpire(false);
  }, [closeTimeStr]);

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

  const closeTime = parseUTC(closeTimeStr);
  const forcedTime = forcedTimeStr ? parseUTC(forcedTimeStr) : closeTime;

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

  useEffect(() => {
    if (isExpired && onExpire && !hasTriggeredExpire && closeTimeStr) {
      setHasTriggeredExpire(true);
      onExpire();
    }
  }, [isExpired, onExpire, hasTriggeredExpire, closeTimeStr]);

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
