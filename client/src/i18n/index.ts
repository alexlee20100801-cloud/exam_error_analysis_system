import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

// 支持的语言列表
export const supportedLanguages = [
  { code: 'zh-CN', name: '简体中文', nativeName: '简体中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: '日本語', nativeName: '日本語' },
  { code: 'ko', name: '한국어', nativeName: '한국어' },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];

// 语言资源
const resources = {
  'zh-CN': { translation: zhCN },
  'en': { translation: en },
  'ja': { translation: ja },
  'ko': { translation: ko },
};

// 浏览器语言映射表 - 将各种语言变体映射到支持的语言
const languageMapping: Record<string, SupportedLanguage> = {
  // 中文变体
  'zh': 'zh-CN',
  'zh-CN': 'zh-CN',
  'zh-Hans': 'zh-CN',
  'zh-Hans-CN': 'zh-CN',
  'zh-SG': 'zh-CN',
  'zh-TW': 'zh-CN', // 繁体中文也映射到简体
  'zh-HK': 'zh-CN',
  'zh-Hant': 'zh-CN',
  // 英文变体
  'en': 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'en-AU': 'en',
  'en-CA': 'en',
  'en-NZ': 'en',
  'en-IE': 'en',
  'en-ZA': 'en',
  'en-IN': 'en',
  // 日语变体
  'ja': 'ja',
  'ja-JP': 'ja',
  // 韩语变体
  'ko': 'ko',
  'ko-KR': 'ko',
};

// 自定义语言检测函数 - 从浏览器语言获取最佳匹配
const detectBrowserLanguage = (): SupportedLanguage => {
  // 获取浏览器语言列表
  const browserLanguages = navigator.languages || [navigator.language];
  
  for (const lang of browserLanguages) {
    // 直接匹配
    if (languageMapping[lang]) {
      return languageMapping[lang];
    }
    
    // 尝试基础语言匹配（如 'zh-TW' -> 'zh'）
    const baseLang = lang.split('-')[0];
    if (languageMapping[baseLang]) {
      return languageMapping[baseLang];
    }
  }
  
  // 默认返回中文
  return 'zh-CN';
};

// 检查是否首次访问
const isFirstVisit = (): boolean => {
  return !localStorage.getItem('i18nextLng') && !localStorage.getItem('hasVisited');
};

// 标记已访问
const markAsVisited = () => {
  localStorage.setItem('hasVisited', 'true');
};

// 初始化i18n
i18n
  .use(LanguageDetector) // 自动检测用户语言
  .use(initReactI18next) // 绑定react-i18next
  .init({
    resources,
    fallbackLng: 'zh-CN', // 默认语言
    supportedLngs: supportedLanguages.map(lang => lang.code),
    
    // 语言检测配置
    detection: {
      // 检测顺序：localStorage -> navigator -> htmlTag
      order: ['localStorage', 'navigator', 'htmlTag'],
      // 缓存到localStorage
      caches: ['localStorage'],
      // localStorage key
      lookupLocalStorage: 'i18nextLng',
      // 自定义语言转换
      convertDetectedLanguage: (lng: string): string => {
        // 使用映射表转换语言
        if (languageMapping[lng]) {
          return languageMapping[lng];
        }
        // 尝试基础语言匹配
        const baseLang = lng.split('-')[0];
        if (languageMapping[baseLang]) {
          return languageMapping[baseLang];
        }
        // 默认返回中文
        return 'zh-CN';
      },
    },
    
    interpolation: {
      escapeValue: false, // React已经处理了XSS
    },
    
    // 调试模式（生产环境关闭）
    debug: import.meta.env.DEV,
    
    // React配置
    react: {
      useSuspense: false, // 避免Suspense相关问题
    },
  });

// 首次访问时自动检测并设置语言
if (isFirstVisit()) {
  const detectedLanguage = detectBrowserLanguage();
  i18n.changeLanguage(detectedLanguage);
  localStorage.setItem('i18nextLng', detectedLanguage);
  markAsVisited();
  
  // 更新HTML lang属性
  document.documentElement.lang = detectedLanguage;
  
  if (import.meta.env.DEV) {
    console.log('[i18n] First visit detected, auto-detected language:', detectedLanguage);
    console.log('[i18n] Browser languages:', navigator.languages || [navigator.language]);
  }
}

// 切换语言函数
export const changeLanguage = (lng: SupportedLanguage) => {
  i18n.changeLanguage(lng);
  // 更新HTML lang属性
  document.documentElement.lang = lng;
  // 存储到localStorage
  localStorage.setItem('i18nextLng', lng);
};

// 获取当前语言
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language || 'zh-CN') as SupportedLanguage;
};

// 检查是否为支持的语言
export const isSupportedLanguage = (lng: string): lng is SupportedLanguage => {
  return supportedLanguages.some(lang => lang.code === lng);
};

// 获取浏览器检测到的语言（用于调试或显示）
export const getDetectedBrowserLanguage = (): SupportedLanguage => {
  return detectBrowserLanguage();
};

// 获取浏览器原始语言列表
export const getBrowserLanguages = (): readonly string[] => {
  return navigator.languages || [navigator.language];
};

// 重置语言偏好（用于测试）
export const resetLanguagePreference = () => {
  localStorage.removeItem('i18nextLng');
  localStorage.removeItem('hasVisited');
  const detectedLanguage = detectBrowserLanguage();
  i18n.changeLanguage(detectedLanguage);
  document.documentElement.lang = detectedLanguage;
};

export default i18n;
