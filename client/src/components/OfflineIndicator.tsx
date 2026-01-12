import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showBanner, setShowBanner] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);
      toast.success(t('pwa.online', '网络已恢复'), {
        icon: <Wifi className="h-4 w-4 text-green-500" />,
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      toast.warning(t('pwa.offline', '当前处于离线状态'), {
        icon: <WifiOff className="h-4 w-4 text-orange-500" />,
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始检查
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [t]);

  if (isOnline || !showBanner) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white py-2 px-4 text-center text-sm animate-in slide-in-from-top">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>{t('pwa.offline', '当前处于离线状态')} - {t('pwa.offlineHint', '部分功能可能不可用')}</span>
        <button
          onClick={() => setShowBanner(false)}
          className="ml-4 px-2 py-0.5 bg-white/20 rounded hover:bg-white/30 transition-colors"
        >
          {t('common.close', '关闭')}
        </button>
      </div>
    </div>
  );
}

// 离线数据同步Hook
export function useOfflineSync() {
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // 检查是否有待同步的数据
    const checkPendingSync = () => {
      const pending = localStorage.getItem('offline-pending-sync');
      if (pending) {
        try {
          const data = JSON.parse(pending);
          setPendingSync(Array.isArray(data) ? data.length : 0);
        } catch {
          setPendingSync(0);
        }
      }
    };

    checkPendingSync();

    // 监听存储变化
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'offline-pending-sync') {
        checkPendingSync();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const syncNow = async () => {
    if (isSyncing || !navigator.onLine) return;

    setIsSyncing(true);
    try {
      // 触发后台同步
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-error-questions');
      }
      
      // 清除待同步数据
      localStorage.removeItem('offline-pending-sync');
      setPendingSync(0);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return { pendingSync, isSyncing, syncNow };
}

// 缓存管理Hook
export function useCacheManagement() {
  const [cacheStatus, setCacheStatus] = useState<{
    static: number;
    runtime: number;
    images: number;
    api: number;
  } | null>(null);

  const getCacheStatus = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise<typeof cacheStatus>((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_STATUS') {
            setCacheStatus(event.data.payload);
            resolve(event.data.payload);
          }
        };
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_CACHE_STATUS' },
          [channel.port2]
        );
      });
    }
    return null;
  };

  const clearCache = async (type?: 'all' | 'api' | 'images') => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageType = type === 'api' 
        ? 'CLEAR_API_CACHE' 
        : type === 'images' 
        ? 'CLEAR_IMAGE_CACHE' 
        : 'CLEAR_CACHE';
      
      navigator.serviceWorker.controller.postMessage({ type: messageType });
      
      // 刷新缓存状态
      setTimeout(getCacheStatus, 500);
    }
  };

  const cacheErrorQuestions = async (urls: string[]) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_ERROR_QUESTIONS',
        payload: { urls },
      });
    }
  };

  return { cacheStatus, getCacheStatus, clearCache, cacheErrorQuestions };
}

export default OfflineIndicator;
