import { useState, useEffect } from 'react';

/**
 * Calculates time-based greeting according to user's local time:
 * - 5:00 AM – 11:59 AM: Good Morning
 * - 12:00 PM – 4:59 PM: Good Afternoon
 * - 5:00 PM – 8:59 PM: Good Evening
 * - 9:00 PM – 4:59 AM: Good Night
 */
export const getTimeBasedGreeting = (date: Date = new Date()): string => {
  const hours = date.getHours();

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
 * React hook that provides dynamic greeting and updates automatically
 * when crossing time boundaries without requiring a page refresh.
 */
export const useTimeGreeting = (
  user?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null
) => {
  const [greetingPrefix, setGreetingPrefix] = useState<string>(() => getTimeBasedGreeting());

  useEffect(() => {
    const updateGreeting = () => {
      const current = getTimeBasedGreeting();
      setGreetingPrefix((prev) => (prev !== current ? current : prev));
    };

    // Check periodically (every 10 seconds) to ensure time range transitions
    // update immediately without user having to refresh the page.
    const intervalId = setInterval(updateGreeting, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const userName = getUserDisplayName(user);

  return {
    greetingPrefix,
    userName,
    fullGreeting: `${greetingPrefix}, ${userName}`
  };
};
