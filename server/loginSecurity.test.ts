/**
 * 登录安全服务测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateDeviceId,
  parseUserAgent,
} from './services/loginSecurity.js';

describe('登录安全服务', () => {
  describe('generateDeviceId', () => {
    it('应该生成16位的设备ID', () => {
      const deviceId = generateDeviceId(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        '192.168.1.1'
      );
      
      expect(deviceId).toHaveLength(16);
      expect(typeof deviceId).toBe('string');
    });

    it('相同的输入应该生成相同的设备ID', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';
      const ipAddress = '192.168.1.1';
      
      const deviceId1 = generateDeviceId(userAgent, ipAddress);
      const deviceId2 = generateDeviceId(userAgent, ipAddress);
      
      expect(deviceId1).toBe(deviceId2);
    });

    it('不同的输入应该生成不同的设备ID', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';
      
      const deviceId1 = generateDeviceId(userAgent, '192.168.1.1');
      const deviceId2 = generateDeviceId(userAgent, '192.168.1.2');
      
      expect(deviceId1).not.toBe(deviceId2);
    });
  });

  describe('parseUserAgent', () => {
    it('应该正确识别Windows桌面设备和Chrome浏览器', () => {
      const result = parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      expect(result.deviceType).toBe('desktop');
      expect(result.browser).toBe('Chrome');
      expect(result.os).toBe('Windows');
    });

    it('应该正确识别macOS桌面设备和Safari浏览器', () => {
      const result = parseUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
      );
      
      expect(result.deviceType).toBe('desktop');
      expect(result.browser).toBe('Safari');
      expect(result.os).toBe('macOS');
    });

    it('应该正确识别iPhone移动设备', () => {
      const result = parseUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      );
      
      expect(result.deviceType).toBe('mobile');
      expect(result.browser).toBe('Safari');
      expect(result.os).toBe('iOS');
    });

    it('应该正确识别Android移动设备', () => {
      const result = parseUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      );
      
      expect(result.deviceType).toBe('mobile');
      expect(result.browser).toBe('Chrome');
      expect(result.os).toBe('Android');
    });

    it('应该正确识别iPad平板设备', () => {
      const result = parseUserAgent(
        'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      );
      
      expect(result.deviceType).toBe('tablet');
      expect(result.browser).toBe('Safari');
      expect(result.os).toBe('iOS');
    });

    it('应该正确识别Firefox浏览器', () => {
      const result = parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
      );
      
      expect(result.browser).toBe('Firefox');
    });

    it('应该正确识别Edge浏览器', () => {
      const result = parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
      );
      
      expect(result.browser).toBe('Edge');
    });

    it('应该处理未知的User-Agent', () => {
      const result = parseUserAgent('Unknown Browser');
      
      expect(result.deviceType).toBe('unknown');
      expect(result.browser).toBe('Unknown');
      expect(result.os).toBe('Unknown');
    });
  });
});
