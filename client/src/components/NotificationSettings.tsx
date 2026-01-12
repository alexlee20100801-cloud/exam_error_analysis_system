import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getReviewReminderConfig,
  saveReviewReminderConfig,
  testNotification,
  type ReviewReminderConfig,
  type NotificationPermissionStatus,
} from '@/services/notificationService';
import { getCurrentLanguage } from '@/i18n';

export function NotificationSettings() {
  const { t } = useTranslation();
  const [permission, setPermission] = useState<NotificationPermissionStatus>('default');
  const [config, setConfig] = useState<ReviewReminderConfig>(getReviewReminderConfig());
  const [isRequesting, setIsRequesting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success(t('settings.notification.notificationSent'));
      } else if (result === 'denied') {
        toast.error(t('settings.notification.permissionDenied'));
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleToggleReminder = (enabled: boolean) => {
    const newConfig = { ...config, enabled };
    setConfig(newConfig);
    saveReviewReminderConfig(newConfig);
    
    if (enabled && permission !== 'granted') {
      handleRequestPermission();
    }
  };

  const handleTimeChange = (time: string) => {
    const newConfig = { ...config, time };
    setConfig(newConfig);
    saveReviewReminderConfig(newConfig);
  };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      await handleRequestPermission();
      return;
    }

    setIsTesting(true);
    try {
      const language = getCurrentLanguage();
      const success = await testNotification(language);
      
      if (success) {
        toast.success(t('settings.notification.notificationSent'));
      } else {
        toast.error(t('errors.serverError'));
      }
    } finally {
      setIsTesting(false);
    }
  };

  // 不支持通知的情况
  if (!isNotificationSupported()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            {t('settings.notification.pushNotification')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('settings.notification.permissionDeniedDesc')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('settings.notification.pushNotification')}
        </CardTitle>
        <CardDescription>
          {t('settings.notification.pushDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 权限状态 */}
        {permission === 'denied' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('settings.notification.permissionDenied')}
              <br />
              <span className="text-sm">
                {t('settings.notification.permissionDeniedDesc')}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {permission === 'default' && (
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{t('settings.notification.enablePush')}</span>
              <Button
                size="sm"
                onClick={handleRequestPermission}
                disabled={isRequesting}
              >
                {isRequesting ? t('common.loading') : t('common.confirm')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {permission === 'granted' && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              {t('settings.notification.notificationSent')}
            </AlertDescription>
          </Alert>
        )}

        {/* 复习提醒开关 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="review-reminder">{t('settings.notification.reviewReminder')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('review.subtitle')}
            </p>
          </div>
          <Switch
            id="review-reminder"
            checked={config.enabled}
            onCheckedChange={handleToggleReminder}
            disabled={permission === 'denied'}
          />
        </div>

        {/* 提醒时间设置 */}
        {config.enabled && (
          <div className="space-y-2">
            <Label htmlFor="reminder-time">{t('review.reminder.time')}</Label>
            <Input
              id="reminder-time"
              type="time"
              value={config.time}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-32"
            />
          </div>
        )}

        {/* 测试通知按钮 */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleTestNotification}
            disabled={isTesting || permission === 'denied'}
          >
            <Bell className="h-4 w-4 mr-2" />
            {isTesting ? t('common.loading') : t('settings.notification.testNotification')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default NotificationSettings;
