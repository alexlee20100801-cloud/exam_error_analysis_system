import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('i18n Translation Files', () => {
  const localesDir = path.join(__dirname, '../client/src/i18n/locales');
  
  it('should have Chinese translation file', () => {
    const zhPath = path.join(localesDir, 'zh-CN.json');
    expect(fs.existsSync(zhPath)).toBe(true);
  });

  it('should have English translation file', () => {
    const enPath = path.join(localesDir, 'en.json');
    expect(fs.existsSync(enPath)).toBe(true);
  });

  it('should have valid JSON in Chinese translation file', () => {
    const zhPath = path.join(localesDir, 'zh-CN.json');
    const content = fs.readFileSync(zhPath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('should have valid JSON in English translation file', () => {
    const enPath = path.join(localesDir, 'en.json');
    const content = fs.readFileSync(enPath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('should have matching keys between Chinese and English translations', () => {
    const zhPath = path.join(localesDir, 'zh-CN.json');
    const enPath = path.join(localesDir, 'en.json');
    
    const zhContent = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    
    // Get all top-level keys
    const zhKeys = Object.keys(zhContent).sort();
    const enKeys = Object.keys(enContent).sort();
    
    expect(zhKeys).toEqual(enKeys);
  });

  it('should have required translation sections', () => {
    const zhPath = path.join(localesDir, 'zh-CN.json');
    const zhContent = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
    
    // Check required sections exist
    expect(zhContent).toHaveProperty('common');
    expect(zhContent).toHaveProperty('nav');
    expect(zhContent).toHaveProperty('home');
    expect(zhContent).toHaveProperty('errorQuestion');
    expect(zhContent).toHaveProperty('settings');
    expect(zhContent).toHaveProperty('pwa');
    expect(zhContent).toHaveProperty('errors');
  });

  it('should have app name in both languages', () => {
    const zhPath = path.join(localesDir, 'zh-CN.json');
    const enPath = path.join(localesDir, 'en.json');
    
    const zhContent = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    
    expect(zhContent.common.appName).toBeDefined();
    expect(enContent.common.appName).toBeDefined();
    expect(zhContent.common.appName).not.toEqual(enContent.common.appName);
  });

  it('should have PWA related translations', () => {
    const zhPath = path.join(localesDir, 'zh-CN.json');
    const zhContent = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
    
    expect(zhContent.pwa.installTitle).toBeDefined();
    expect(zhContent.pwa.installDesc).toBeDefined();
    expect(zhContent.pwa.install).toBeDefined();
    expect(zhContent.pwa.offline).toBeDefined();
    expect(zhContent.pwa.online).toBeDefined();
  });
});

describe('i18n Configuration', () => {
  it('should have i18n index file', () => {
    const indexPath = path.join(__dirname, '../client/src/i18n/index.ts');
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  it('should export supported languages', () => {
    const indexPath = path.join(__dirname, '../client/src/i18n/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    
    expect(content).toContain('supportedLanguages');
    expect(content).toContain('zh-CN');
    expect(content).toContain('en');
  });

  it('should export changeLanguage function', () => {
    const indexPath = path.join(__dirname, '../client/src/i18n/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    
    expect(content).toContain('export const changeLanguage');
  });

  it('should export getCurrentLanguage function', () => {
    const indexPath = path.join(__dirname, '../client/src/i18n/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    
    expect(content).toContain('export const getCurrentLanguage');
  });
});
