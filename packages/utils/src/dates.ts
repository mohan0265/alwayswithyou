import { format, parseISO, isAfter, isBefore, addHours, subHours } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:MM format
  end: string; // HH:MM format
  days: number[]; // 0=Sunday, 6=Saturday
  timezone: string;
}

/**
 * Check if current time is within quiet hours for a user
 */
export function isInQuietHours(quietHours: QuietHours, timezone?: string): boolean {
  if (!quietHours.enabled) {
    return false;
  }

  const tz = timezone || quietHours.timezone || 'UTC';
  const now = new Date();
  const localNow = utcToZonedTime(now, tz);
  
  // Get current day of week (0=Sunday)
  const currentDay = localNow.getDay();
  
  // Check if today is in quiet hours days
  if (!quietHours.days.includes(currentDay)) {
    return false;
  }

  // Parse start and end times
  const [startHour, startMinute] = quietHours.start.split(':').map(Number);
  const [endHour, endMinute] = quietHours.end.split(':').map(Number);

  // Create start and end times for today
  const startTime = new Date(localNow);
  startTime.setHours(startHour, startMinute, 0, 0);

  const endTime = new Date(localNow);
  endTime.setHours(endHour, endMinute, 0, 0);

  // Handle overnight quiet hours (e.g., 22:00 to 06:00)
  if (endTime <= startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }

  // Check if current time is within quiet hours
  return localNow >= startTime && localNow <= endTime;
}

/**
 * Get next time when quiet hours end
 */
export function getQuietHoursEndTime(quietHours: QuietHours, timezone?: string): Date | null {
  if (!quietHours.enabled || !isInQuietHours(quietHours, timezone)) {
    return null;
  }

  const tz = timezone || quietHours.timezone || 'UTC';
  const now = new Date();
  const localNow = utcToZonedTime(now, tz);

  const [endHour, endMinute] = quietHours.end.split(':').map(Number);
  const endTime = new Date(localNow);
  endTime.setHours(endHour, endMinute, 0, 0);

  // If end time is before current time, it's tomorrow
  if (endTime <= localNow) {
    endTime.setDate(endTime.getDate() + 1);
  }

  return zonedTimeToUtc(endTime, tz);
}

/**
 * Format date in user's timezone
 */
export function formatInUserTimezone(
  date: Date | string,
  timezone: string,
  formatString: string = 'PPpp'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, timezone, formatString);
}

/**
 * Get relative time string (e.g., "2 minutes ago", "in 1 hour")
 */
export function getRelativeTime(date: Date | string, timezone?: string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return timezone 
      ? formatInUserTimezone(dateObj, timezone, 'MMM d, yyyy')
      : format(dateObj, 'MMM d, yyyy');
  }
}

/**
 * Check if a date is today in the given timezone
 */
export function isToday(date: Date | string, timezone: string = 'UTC'): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  
  const dateInTz = formatInTimeZone(dateObj, timezone, 'yyyy-MM-dd');
  const todayInTz = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  
  return dateInTz === todayInTz;
}

/**
 * Get start and end of day in timezone
 */
export function getDayBounds(date: Date | string, timezone: string): { start: Date; end: Date } {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const localDate = utcToZonedTime(dateObj, timezone);
  
  const start = new Date(localDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(localDate);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: zonedTimeToUtc(start, timezone),
    end: zonedTimeToUtc(end, timezone),
  };
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Get timezone offset in minutes
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  const utcDate = new Date(date.toISOString());
  const tzDate = utcToZonedTime(utcDate, timezone);
  return (utcDate.getTime() - tzDate.getTime()) / (1000 * 60);
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get common timezone options for UI
 */
export function getCommonTimezones(): Array<{ value: string; label: string }> {
  return [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
  ];
}

