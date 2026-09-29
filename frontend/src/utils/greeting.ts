import { useState, useEffect } from 'react';

/**
 * Automatically detects the user's timezone from their browser/device using standard Intl API.
 * Returns the detected IANA timezone identifier (e.g., 'America/New_York', 'Asia/Kolkata', 'Europe/London')
 * or undefined if unavailable.
 */
export const detectUserTimeZone = (): string | undefined => {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && typeof detected === 'string' && detected.trim().length > 0) {
        return detected.trim();
      }
    }
  } catch (err) {
    console.warn('Could not detect browser timezone via Intl.DateTimeFormat:', err);
  }
  return undefined;
};

/**
 * Resolves the numeric hour (0-23) for a given date in the specified timezone.
 * If timeZone is omitted, invalid, or unsupported, gracefully falls back to the device's local hour.
 */
export const getHourInTimeZone = (date: Date = new Date(), timeZone?: string): number => {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        hourCycle: 'h23',
      }).formatToParts(date);
      const hourPart = parts.find((p) => p.type === 'hour')?.value;
      if (hourPart !== undefined) {
        const parsed = parseInt(hourPart, 10);
        if (!isNaN(parsed)) {
          return parsed % 24;
        }
      }
    } catch {
      // Sensible fallback: If timezone string is unrecognized or unsupported, fallback to date.getHours()
    }
  }
  return date.getHours();
};

/**
 * Calculates time-based greeting according to user's local timezone:
 * - 5:00 AM – 11:59 AM: Good Morning
 * - 12:00 PM – 4:59 PM: Good Afternoon
 * - 5:00 PM – 8:59 PM: Good Evening
 * - 9:00 PM – 4:59 AM: Good Night
 *
 * @param date - The Date reference (defaults to new Date())
 * @param timeZone - The IANA timezone string. If omitted, automatically detects browser timezone.
 */
export const getTimeBasedGreeting = (
  date: Date = new Date(),
  timeZone: string | undefined = detectUserTimeZone()
): string => {
  const hours = getHourInTimeZone(date, timeZone);

  if (hours >= 5 && hours < 12) {
    return 'Good Morning';
  } else if (hours >= 12 && hours < 17) {
    return 'Good Afternoon';
  } else if (hours >= 17 && hours < 21) {
    return 'Good Evening';
  } else {
    return 'Good Night';
  }
};

/**
 * Extracts a graceful display name from user session object:
 * Prefers first_name, then last_name, then email handle, fallback to 'Finance Leader'.
 */
export const getUserDisplayName = (
  user?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null
): string => {
  if (!user) return 'Finance Leader';

  const firstName = user.first_name?.trim();
  if (firstName) return firstName;

  const lastName = user.last_name?.trim();
  if (lastName) return lastName;

  if (user.email?.trim()) {
    const emailPrefix = user.email.trim().split('@')[0];
    if (emailPrefix) {
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
  }

  return 'Finance Leader';
};

/**
 * React hook that provides dynamic, timezone-aware greeting.
 * Automatically checks and updates when crossing time boundaries without requiring a page refresh.
 *
 * @param user - Authenticated user object or session
 * @param customTimeZone - Optional custom timezone override (defaults to detected browser timezone)
 */
export const useTimeGreeting = (
  user?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null,
  customTimeZone?: string
) => {
  const resolvedTimeZone = customTimeZone || detectUserTimeZone();
  const [greetingPrefix, setGreetingPrefix] = useState<string>(() =>
    getTimeBasedGreeting(new Date(), resolvedTimeZone)
  );

  useEffect(() => {
    const tz = customTimeZone || detectUserTimeZone();

    const updateGreeting = () => {
      const current = getTimeBasedGreeting(new Date(), tz);
      setGreetingPrefix((prev) => (prev !== current ? current : prev));
    };

    updateGreeting();

    // Check periodically (every 10 seconds) to ensure transitions update immediately
    // without requiring page reload
    const intervalId = setInterval(updateGreeting, 10000);
    return () => clearInterval(intervalId);
  }, [customTimeZone]);

  const userName = getUserDisplayName(user);

  return {
    greetingPrefix,
    userName,
    fullGreeting: `${greetingPrefix}, ${userName}`,
    timeZone: resolvedTimeZone || 'Local'
  };
};
