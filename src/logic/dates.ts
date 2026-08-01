const weekdayInitials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * The learner's own calendar day. `toISOString` would roll over at UTC
 * midnight, which marks late evening practice in Istanbul as tomorrow.
 */
export function dateKey(daysAgo = 0, now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
}

/** The last seven days ending today, so the strip follows the real weekday. */
export function recentWeek(now = new Date()) {
  return Array.from({length: 7}, (_, index) => {
    const daysAgo = 6 - index;
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return {
      key: dateKey(daysAgo, now),
      label: weekdayInitials[date.getDay()],
      name: weekdayNames[date.getDay()],
      isToday: daysAgo === 0,
    };
  });
}
