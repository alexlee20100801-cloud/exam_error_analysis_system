import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

// 支持的语言列表
export const supportedLanguages = [
  { code: 'zh-CN', name: '简体中文', nativeName: '简体中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];

// 语言资源
const resources = {
  'zh-CN': { translation: zhCN },
  'en': { translation: en },
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

export default i18n;
