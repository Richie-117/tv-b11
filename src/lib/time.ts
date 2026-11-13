export const APP_TIMEZONE = 'Asia/Colombo';

export interface SriLankaTime {
  date: string;         // "YYYY-MM-DD"
  time: string;         // "HH:MM"
  timeWithSeconds: string; // "HH:MM:SS"
  minutesNow: number;   // Minutes from midnight
  dayOfWeek: string;    // "Monday" .. "Sunday"
  formattedDate: string;// "Thursday, 12 November 2026"
  formattedTime: string;// "11:02 PM"
}

/**
 * Returns current Sri Lanka date and time without relying on client device clocks.
 */
export function getSriLankaTime(referenceDate: Date = new Date()): SriLankaTime {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(referenceDate);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const year = map.year || '2026';
  const month = map.month || '01';
  const day = map.day || '01';
  const dayOfWeek = map.weekday || 'Monday';
  const hour = parseInt(map.hour || '0', 10);
  const minute = parseInt(map.minute || '0', 10);
  const second = parseInt(map.second || '0', 10);

  const date = `${year}-${month}-${day}`;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const timeWithSeconds = `${time}:${second.toString().padStart(2, '0')}`;
  const minutesNow = hour * 60 + minute;

  const formattedDate = referenceDate.toLocaleDateString('en-GB', {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = referenceDate.toLocaleTimeString('en-US', {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    date,
    time,
    timeWithSeconds,
    minutesNow,
    dayOfWeek,
    formattedDate,
    formattedTime,
  };
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toLowerCase();
  const isPM = clean.includes('p.m') || clean.includes('pm');
  const isAM = clean.includes('a.m') || clean.includes('am');

  const match = clean.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return 0;
}
