/**
 * 服务端时区处理工具
 * 
 * 确保所有时间戳以UTC格式存储，并提供转换工具
 */

/**
 * 获取当前UTC时间戳（毫秒）
 */
export function getUTCTimestamp(): number {
  return Date.now();
}

/**
 * 获取当前UTC日期对象
 */
export function getUTCDate(): Date {
  return new Date();
}

/**
 * 将日期转换为UTC时间戳（毫秒）
 */
export function toUTCTimestamp(date: Date | string | number): number {
  if (typeof date === 'number') return date;
  if (typeof date === 'string') return new Date(date).getTime();
  return date.getTime();
}

/**
 * 从UTC时间戳创建Date对象
 */
export function fromUTCTimestamp(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * 将日期格式化为ISO 8601字符串（带时区）
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * 解析ISO 8601日期字符串
 */
export function parseISOString(isoString: string): Date {
  return new Date(isoString);
}

/**
 * 获取一天的开始时间（UTC）
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * 获取一天的结束时间（UTC）
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * 获取一周的开始时间（UTC，周一为一周开始）
 */
export function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * 获取一周的结束时间（UTC）
 */
export function getEndOfWeek(date: Date = new Date()): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

/**
 * 获取一个月的开始时间（UTC）
 */
export function getStartOfMonth(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * 获取一个月的结束时间（UTC）
 */
export function getEndOfMonth(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * 添加天数
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * 添加小时
 */
export function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setUTCHours(d.getUTCHours() + hours);
  return d;
}

/**
 * 添加分钟
 */
export function addMinutes(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d;
}

/**
 * 计算两个日期之间的天数差
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

/**
 * 检查日期是否在范围内
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

/**
 * 常用时区列表
 */
export const COMMON_TIMEZONES = [
  { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)' },
  { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)' },
  { value: 'Asia/Taipei', label: '台北时间 (UTC+8)' },
  { value: 'Asia/Tokyo', label: '日本标准时间 (UTC+9)' },
  { value: 'Asia/Seoul', label: '韩国标准时间 (UTC+9)' },
  { value: 'Asia/Singapore', label: '新加坡时间 (UTC+8)' },
  { value: 'America/New_York', label: '美国东部时间 (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: '美国太平洋时间 (UTC-8/-7)' },
  { value: 'Europe/London', label: '英国时间 (UTC+0/+1)' },
  { value: 'Europe/Paris', label: '中欧时间 (UTC+1/+2)' },
  { value: 'Australia/Sydney', label: '澳大利亚东部时间 (UTC+10/+11)' },
  { value: 'UTC', label: '协调世界时 (UTC)' },
] as const;

/**
 * 验证时区是否有效
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
