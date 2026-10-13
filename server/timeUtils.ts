/**
 * Time utility functions for IST (Asia/Kolkata, UTC+5:30)
 * Handles mobile login windows (10:00 AM - 1:00 PM IST)
 * and payment checkout windows (10:00 AM - 11:00 AM IST).
 */

export interface ISTTimeInfo {
  hours: number;
  minutes: number;
  seconds: number;
  dateString: string;
  dayString: string;
  fullDate: Date;
}

/**
 * Returns the current time components in Asia/Kolkata timezone
 */
export function getISTTime(date: Date = new Date()): ISTTimeInfo {
  // Use Intl.DateTimeFormat to reliably parse Asia/Kolkata components
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let year = '';
  let month = '';
  let day = '';
  let weekday = '';

  for (const part of parts) {
    if (part.type === 'hour') hours = parseInt(part.value, 10);
    if (part.type === 'minute') minutes = parseInt(part.value, 10);
    if (part.type === 'second') seconds = parseInt(part.value, 10);
    if (part.type === 'year') year = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'day') day = part.value;
    if (part.type === 'weekday') weekday = part.value;
  }

  // Handle 24-hour rollover (e.g. 24 -> 0 if formatted as such)
  if (hours === 24) hours = 0;

  return {
    hours,
    minutes,
    seconds,
    dateString: `${year}-${month}-${day}`,
    dayString: weekday,
    fullDate: date,
  };
}

/**
 * Restricts mobile device logins to 10:00 AM - 1:00 PM IST (10:00 - 13:00)
 */
export function isWithinMobileLoginWindow(date: Date = new Date()): boolean {
  const ist = getISTTime(date);
  // 10:00 AM to 1:00 PM IST inclusive of 10:00:00 to 12:59:59
  return ist.hours >= 10 && ist.hours < 13;
}

/**
 * Restricts subscription payment checkout initiation to 10:00 AM - 11:00 AM IST (10:00 - 11:00)
 */
export function isWithinPaymentWindow(date: Date = new Date()): boolean {
  const ist = getISTTime(date);
  // 10:00 AM to 11:00 AM IST inclusive of 10:00:00 to 10:59:59
  return ist.hours >= 10 && ist.hours < 11;
}

/**
 * Get human-readable IST string for headers / audit logs
 */
export function getISTFormattedString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
}
