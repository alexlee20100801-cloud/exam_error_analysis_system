import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // 检查是否已经安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // 检查是否已经关闭过安装提示
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      return;
    }

    // 监听beforeinstallprompt事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 延迟3秒显示安装提示，避免打扰用户
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 监听安装完成事件
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      toast.success(t('pwa.installed', '应用已成功安装到主屏幕！'));
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // 显示安装提示
    await deferredPrompt.prompt();

    // 等待用户选择
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success(t('pwa.installing', '正在安装应用...'));
    }

    // 清除deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // 如果已安装或不显示提示，则不渲染
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-2xl p-4 border border-blue-400">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1">{t('pwa.installTitle', '安装到主屏幕')}</h3>
            <p className="text-sm text-blue-50 opacity-90">
              {t('pwa.installDesc', '将应用添加到主屏幕，像原生APP一样使用，支持离线访问')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-white text-blue-600 hover:bg-blue-50 font-medium"
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            {t('pwa.install', '立即安装')}
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="text-white hover:bg-white/20"
            size="sm"
          >
            {t('pwa.later', '稍后')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// PWA注册函数
export function registerPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration: any) => {
          console.log('✓ Service Worker registered:', registration.scope);

          // 检查更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 有新版本可用
                  const t = (key: string, fallback: string) => fallback; // 简化版本
                  toast.info(t('pwa.newVersion', '发现新版本，刷新页面以更新'), {
                    action: {
                      label: t('pwa.refresh', '刷新'),
                      onClick: () => window.location.reload(),
                    },
                    duration: 10000,
                  });
                }
              });
            }
          });
        })
        .catch((error: any) => {
          console.error('✗ Service Worker registration failed:', error);
        });
    });
  }
}
