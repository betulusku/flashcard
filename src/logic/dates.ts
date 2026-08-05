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

/**
 * Current calendar week in US order (Sunday → Saturday).
 * Today stays in its fixed slot — it does not slide to the end.
 */
export function recentWeek(now = new Date()) {
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  return Array.from({length: 7}, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return {
      key,
      label: weekdayInitials[index],
      name: weekdayNames[index],
      isToday: key === dateKey(0, now),
    };
  });
}
