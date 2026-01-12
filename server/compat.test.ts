/**
 * 浏览器兼容性和国际化工具测试
 */

import { describe, it, expect } from 'vitest';
import {
  getUTCTimestamp,
  getUTCDate,
  toUTCTimestamp,
  fromUTCTimestamp,
  toISOString,
  parseISOString,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  addDays,
  addHours,
  addMinutes,
  daysBetween,
  isDateInRange,
  isValidTimezone,
  COMMON_TIMEZONES,
} from './utils/timezone';

describe('时区处理工具', () => {
  describe('getUTCTimestamp', () => {
    it('应该返回当前UTC时间戳', () => {
      const timestamp = getUTCTimestamp();
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
      expect(Math.abs(timestamp - Date.now())).toBeLessThan(1000);
    });
  });

  describe('getUTCDate', () => {
    it('应该返回Date对象', () => {
      const date = getUTCDate();
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeGreaterThan(0);
    });
  });

  describe('toUTCTimestamp', () => {
    it('应该正确处理Date对象', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const timestamp = toUTCTimestamp(date);
      expect(timestamp).toBe(date.getTime());
    });

    it('应该正确处理时间戳数字', () => {
      const timestamp = 1705320000000;
      expect(toUTCTimestamp(timestamp)).toBe(timestamp);
    });

    it('应该正确处理日期字符串', () => {
      const dateStr = '2024-01-15T12:00:00Z';
      const timestamp = toUTCTimestamp(dateStr);
      expect(timestamp).toBe(new Date(dateStr).getTime());
    });
  });

  describe('fromUTCTimestamp', () => {
    it('应该从时间戳创建Date对象', () => {
      const timestamp = 1705320000000;
      const date = fromUTCTimestamp(timestamp);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(timestamp);
    });
  });

  describe('toISOString', () => {
    it('应该返回ISO 8601格式字符串', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const isoString = toISOString(date);
      expect(isoString).toBe('2024-01-15T12:00:00.000Z');
    });
  });

  describe('parseISOString', () => {
    it('应该正确解析ISO 8601字符串', () => {
      const isoString = '2024-01-15T12:00:00.000Z';
      const date = parseISOString(isoString);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe(isoString);
    });
  });

  describe('getStartOfDay', () => {
    it('应该返回一天的开始时间', () => {
      const date = new Date('2024-01-15T15:30:45.123Z');
      const startOfDay = getStartOfDay(date);
      expect(startOfDay.getUTCHours()).toBe(0);
      expect(startOfDay.getUTCMinutes()).toBe(0);
      expect(startOfDay.getUTCSeconds()).toBe(0);
      expect(startOfDay.getUTCMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('应该返回一天的结束时间', () => {
      const date = new Date('2024-01-15T15:30:45.123Z');
      const endOfDay = getEndOfDay(date);
      expect(endOfDay.getUTCHours()).toBe(23);
      expect(endOfDay.getUTCMinutes()).toBe(59);
      expect(endOfDay.getUTCSeconds()).toBe(59);
      expect(endOfDay.getUTCMilliseconds()).toBe(999);
    });
  });

  describe('getStartOfWeek', () => {
    it('应该返回一周的开始时间（周一）', () => {
      const date = new Date('2024-01-17T12:00:00Z');
      const startOfWeek = getStartOfWeek(date);
      expect(startOfWeek.getUTCDay()).toBe(1);
      expect(startOfWeek.getUTCDate()).toBe(15);
    });
  });

  describe('getEndOfWeek', () => {
    it('应该返回一周的结束时间（周日）', () => {
      const date = new Date('2024-01-17T12:00:00Z');
      const endOfWeek = getEndOfWeek(date);
      expect(endOfWeek.getUTCDay()).toBe(0);
      expect(endOfWeek.getUTCDate()).toBe(21);
    });
  });

  describe('getStartOfMonth', () => {
    it('应该返回一个月的开始时间', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const startOfMonth = getStartOfMonth(date);
      expect(startOfMonth.getUTCDate()).toBe(1);
      expect(startOfMonth.getUTCHours()).toBe(0);
    });
  });

  describe('getEndOfMonth', () => {
    it('应该返回一个月的结束时间', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const endOfMonth = getEndOfMonth(date);
      expect(endOfMonth.getUTCDate()).toBe(31);
      expect(endOfMonth.getUTCHours()).toBe(23);
      expect(endOfMonth.getUTCMinutes()).toBe(59);
    });

    it('应该正确处理2月', () => {
      const date = new Date('2024-02-15T12:00:00Z');
      const endOfMonth = getEndOfMonth(date);
      expect(endOfMonth.getUTCDate()).toBe(29);
    });
  });

  describe('addDays', () => {
    it('应该正确添加天数', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const newDate = addDays(date, 5);
      expect(newDate.getUTCDate()).toBe(20);
    });

    it('应该正确处理负数', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const newDate = addDays(date, -5);
      expect(newDate.getUTCDate()).toBe(10);
    });

    it('应该正确处理跨月', () => {
      const date = new Date('2024-01-30T12:00:00Z');
      const newDate = addDays(date, 5);
      expect(newDate.getUTCMonth()).toBe(1);
      expect(newDate.getUTCDate()).toBe(4);
    });
  });

  describe('addHours', () => {
    it('应该正确添加小时', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const newDate = addHours(date, 5);
      expect(newDate.getUTCHours()).toBe(17);
    });
  });

  describe('addMinutes', () => {
    it('应该正确添加分钟', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const newDate = addMinutes(date, 30);
      expect(newDate.getUTCMinutes()).toBe(30);
    });
  });

  describe('daysBetween', () => {
    it('应该正确计算两个日期之间的天数', () => {
      const date1 = new Date('2024-01-15T12:00:00Z');
      const date2 = new Date('2024-01-20T12:00:00Z');
      expect(daysBetween(date1, date2)).toBe(5);
    });

    it('应该返回绝对值', () => {
      const date1 = new Date('2024-01-20T12:00:00Z');
      const date2 = new Date('2024-01-15T12:00:00Z');
      expect(daysBetween(date1, date2)).toBe(5);
    });
  });

  describe('isDateInRange', () => {
    it('应该正确判断日期是否在范围内', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-31T23:59:59Z');
      const date = new Date('2024-01-15T12:00:00Z');
      expect(isDateInRange(date, start, end)).toBe(true);
    });

    it('应该正确判断日期不在范围内', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-31T23:59:59Z');
      const date = new Date('2024-02-15T12:00:00Z');
      expect(isDateInRange(date, start, end)).toBe(false);
    });

    it('应该包含边界值', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-31T23:59:59Z');
      expect(isDateInRange(start, start, end)).toBe(true);
      expect(isDateInRange(end, start, end)).toBe(true);
    });
  });

  describe('isValidTimezone', () => {
    it('应该验证有效的时区', () => {
      expect(isValidTimezone('Asia/Shanghai')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
    });

    it('应该拒绝无效的时区', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('ABC')).toBe(false);
    });
  });

  describe('COMMON_TIMEZONES', () => {
    it('应该包含常用时区', () => {
      expect(COMMON_TIMEZONES.length).toBeGreaterThan(0);
      
      const values = COMMON_TIMEZONES.map(tz => tz.value);
      expect(values).toContain('Asia/Shanghai');
      expect(values).toContain('UTC');
    });

    it('所有时区都应该是有效的', () => {
      for (const tz of COMMON_TIMEZONES) {
        expect(isValidTimezone(tz.value)).toBe(true);
      }
    });
  });
});
