import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supportedLanguages, changeLanguage, type SupportedLanguage } from '@/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const handleLanguageChange = (lng: SupportedLanguage) => {
    changeLanguage(lng);
  };

  // 获取当前语言的显示名称
  const currentLangInfo = supportedLanguages.find(
    lang => lang.code === currentLang || currentLang.startsWith(lang.code.split('-')[0])
  ) || supportedLanguages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLangInfo.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`cursor-pointer ${
              currentLang === lang.code || currentLang.startsWith(lang.code.split('-')[0])
                ? 'bg-accent'
                : ''
            }`}
          >
            <span className="flex-1">{lang.nativeName}</span>
            {(currentLang === lang.code || currentLang.startsWith(lang.code.split('-')[0])) && (
              <span className="ml-2 text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 紧凑版语言切换器（用于移动端或空间有限的地方）
export function LanguageSwitcherCompact() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const handleToggle = () => {
    // 在中英文之间切换
    const newLang = currentLang === 'en' || currentLang.startsWith('en') ? 'zh-CN' : 'en';
    changeLanguage(newLang);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="h-9 w-9"
      title={currentLang === 'en' || currentLang.startsWith('en') ? '切换到中文' : 'Switch to English'}
    >
      <Globe className="h-4 w-4" />
    </Button>
  );
}

export default LanguageSwitcher;
