import {dateKey, greeting, recentWeek} from '../src/logic/dates';

describe('dateKey', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // 23:30 local: toISOString would already report the next day east of UTC.
    const lateEvening = new Date(2026, 7, 1, 23, 30);
    expect(dateKey(0, lateEvening)).toBe('2026-08-01');
  });

  it('walks back across a month boundary', () => {
    expect(dateKey(2, new Date(2026, 7, 1, 9, 0))).toBe('2026-07-30');
  });
});

describe('greeting', () => {
  it('follows the hour of the day', () => {
    expect(greeting(new Date(2026, 7, 1, 8, 0))).toBe('Good morning');
    expect(greeting(new Date(2026, 7, 1, 14, 0))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 7, 1, 19, 0))).toBe('Good evening');
    expect(greeting(new Date(2026, 7, 1, 23, 0))).toBe('Good night');
    expect(greeting(new Date(2026, 7, 1, 3, 0))).toBe('Good night');
  });
});

describe('recentWeek', () => {
  const saturday = new Date(2026, 7, 1, 13, 0);

  it('ends on today with the real weekday initial', () => {
    const week = recentWeek(saturday);
    expect(week).toHaveLength(7);
    expect(week[6]).toMatchObject({label: 'S', name: 'Saturday', isToday: true, key: '2026-08-01'});
    expect(week.filter(day => day.isToday)).toHaveLength(1);
  });

  it('lists the six days before today in order', () => {
    expect(recentWeek(saturday).map(day => day.name)).toEqual([
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
    ]);
  });
});
