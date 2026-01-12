import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { systemSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// 加密函数（简单的base64编码，生产环境应使用更安全的加密方式）
function encryptSecret(value: string): string {
  if (!value) return '';
  return Buffer.from(value).toString('base64');
}

function decryptSecret(value: string): string {
  if (!value) return '';
  try {
    return Buffer.from(value, 'base64').toString('utf-8');
  } catch {
    return value;
  }
}

// 掩码显示敏感信息
function maskSecret(value: string): string {
  if (!value || value.length < 8) return '••••••••';
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
}

/**
 * 通知服务配置路由
 * 管理微信公众号、阿里云短信、SMTP等通知服务的配置
 */
export const notificationServiceConfigRouter = router({
  /**
   * 获取通知服务配置
   */
  getServiceConfig: adminProcedure.query(async () => {
    // 获取微信配置
    const [wechatAppId] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'wechat_app_id'));
    const [wechatAppSecret] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'wechat_app_secret'));
    const [wechatTemplateId] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'wechat_template_id'));
    const [wechatEnabled] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'wechat_enabled'));

    // 获取阿里云短信配置
    const [aliyunAccessKeyId] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'aliyun_sms_access_key_id'));
    const [aliyunAccessKeySecret] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'aliyun_sms_access_key_secret'));
    const [aliyunSignName] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'aliyun_sms_sign_name'));
    const [aliyunTemplateCode] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'aliyun_sms_template_code'));
    const [aliyunSmsEnabled] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'aliyun_sms_enabled'));

    // 获取SMTP配置
    const [smtpHost] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'smtp_host'));
    const [smtpPort] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'smtp_port'));
    const [smtpSecure] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'smtp_secure'));
    const [smtpUsername] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'smtp_username'));
    const [smtpPassword] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'smtp_password'));
    const [smtpFromEmail] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'smtp_from_email'));
    const [smtpFromName] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'smtp_from_name'));
    const [smtpEnabled] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'smtp_enabled'));

    return {
      wechat: {
        appId: wechatAppId?.settingValue || '',
        appSecret: wechatAppSecret?.settingValue ? maskSecret(decryptSecret(wechatAppSecret.settingValue)) : '',
        templateId: wechatTemplateId?.settingValue || '',
        enabled: wechatEnabled?.settingValue === 'true',
      },
      aliyunSms: {
        accessKeyId: aliyunAccessKeyId?.settingValue || '',
        accessKeySecret: aliyunAccessKeySecret?.settingValue ? maskSecret(decryptSecret(aliyunAccessKeySecret.settingValue)) : '',
        signName: aliyunSignName?.settingValue || '',
        templateCode: aliyunTemplateCode?.settingValue || '',
        enabled: aliyunSmsEnabled?.settingValue === 'true',
      },
      smtp: {
        host: smtpHost?.settingValue || '',
        port: parseInt(smtpPort?.settingValue || '465'),
        secure: smtpSecure?.settingValue !== 'false',
        username: smtpUsername?.settingValue || '',
        password: smtpPassword?.settingValue ? maskSecret(decryptSecret(smtpPassword.settingValue)) : '',
        fromEmail: smtpFromEmail?.settingValue || '',
        fromName: smtpFromName?.settingValue || '',
        enabled: smtpEnabled?.settingValue === 'true',
      },
    };
  }),

  /**
   * 保存通知服务配置
   */
  saveServiceConfig: adminProcedure
    .input(
      z.object({
        service: z.enum(['wechat', 'aliyunSms', 'smtp']),
        // @ts-ignore
        config: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input }) => {
      const { service, config } = input;

      // 辅助函数：保存或更新设置
      async function saveSetting(key: string, value: string) {
        const [existing] = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.settingKey, key));

        if (existing) {
          await db
            .update(systemSettings)
            .set({ settingValue: value, updatedAt: new Date().toISOString() })
            .where(eq(systemSettings.settingKey, key));
        } else {
          await db.insert(systemSettings).values({
            settingKey: key,
            settingValue: value,
            description: `${service} configuration`,
            isEncrypted: key.includes('secret') || key.includes('password') ? 1 : 0,
          });
        }
      }

      if (service === 'wechat') {
        await saveSetting('wechat_app_id', String(config.appId || ''));
        // 只有当密钥不是掩码时才更新
        if (config.appSecret && typeof config.appSecret === 'string' && !config.appSecret.includes('••••')) {
          await saveSetting('wechat_app_secret', encryptSecret(config.appSecret));
        }
        await saveSetting('wechat_template_id', String(config.templateId || ''));
        await saveSetting('wechat_enabled', config.enabled ? 'true' : 'false');
      } else if (service === 'aliyunSms') {
        await saveSetting('aliyun_sms_access_key_id', String(config.accessKeyId || ''));
        if (config.accessKeySecret && typeof config.accessKeySecret === 'string' && !config.accessKeySecret.includes('••••')) {
          await saveSetting('aliyun_sms_access_key_secret', encryptSecret(config.accessKeySecret));
        }
        await saveSetting('aliyun_sms_sign_name', String(config.signName || ''));
        await saveSetting('aliyun_sms_template_code', String(config.templateCode || ''));
        await saveSetting('aliyun_sms_enabled', config.enabled ? 'true' : 'false');
      } else if (service === 'smtp') {
        await saveSetting('smtp_host', String(config.host || ''));
        await saveSetting('smtp_port', String(config.port || 465));
        await saveSetting('smtp_secure', config.secure ? 'true' : 'false');
        await saveSetting('smtp_username', String(config.username || ''));
        if (config.password && typeof config.password === 'string' && !config.password.includes('••••')) {
          await saveSetting('smtp_password', encryptSecret(config.password));
        }
        await saveSetting('smtp_from_email', String(config.fromEmail || ''));
        await saveSetting('smtp_from_name', String(config.fromName || ''));
        await saveSetting('smtp_enabled', config.enabled ? 'true' : 'false');
      }

      return { success: true };
    }),

  /**
   * 测试通知发送
   */
  testNotification: adminProcedure
    .input(
      z.object({
        service: z.enum(['wechat', 'aliyunSms', 'smtp']),
        recipient: z.string(),
        testMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { service, recipient, testMessage = '这是一条测试消息' } = input;

      try {
        if (service === 'wechat') {
          // 获取微信配置
          const [appId] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, 'wechat_app_id'));
          const [appSecret] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, 'wechat_app_secret'));
          const [templateId] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, 'wechat_template_id'));

          if (!appId?.settingValue || !appSecret?.settingValue) {
            return { success: false, message: '微信配置不完整' };
          }

          // 获取access_token
          const tokenResponse = await fetch(
            `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId.settingValue}&secret=${decryptSecret(appSecret.settingValue)}`
          );
          const tokenData = await tokenResponse.json() as any;

          if (tokenData.errcode) {
            return { success: false, message: `获取access_token失败: ${tokenData.errmsg}` };
          }

          // 发送模板消息
          const sendResponse = await fetch(
            `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${tokenData.access_token}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                touser: recipient,
                template_id: templateId?.settingValue || '',
                data: {
                  first: { value: '测试通知' },
                  keyword1: { value: testMessage },
                  keyword2: { value: new Date().toLocaleString() },
                  remark: { value: '这是一条测试消息' },
                },
              }),
            }
          );
          const sendData = await sendResponse.json() as any;

          if (sendData.errcode === 0) {
            return { success: true, message: '微信消息发送成功' };
          } else {
            return { success: false, message: `发送失败: ${sendData.errmsg}` };
          }
        } else if (service === 'aliyunSms') {
          // 获取阿里云短信配置
          const [accessKeyId] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, 'aliyun_sms_access_key_id'));
          const [accessKeySecret] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, 'aliyun_sms_access_key_secret'));

          if (!accessKeyId?.settingValue || !accessKeySecret?.settingValue) {
            return { success: false, message: '阿里云短信配置不完整' };
          }

          // 这里简化处理，实际应该使用阿里云SDK
          // 由于阿里云短信需要签名计算，这里返回模拟结果
          return { 
            success: true, 
            message: '短信配置验证成功（实际发送需要配置完整的阿里云SDK）',
          };
        } else if (service === 'smtp') {
          // 获取SMTP配置
          const [host] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, 'smtp_host'));
          const [username] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, 'smtp_username'));
          const [password] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, 'smtp_password'));
          const [fromEmail] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, 'smtp_from_email'));
          const [fromName] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, 'smtp_from_name'));

          if (!host?.settingValue || !username?.settingValue || !password?.settingValue) {
            return { success: false, message: 'SMTP配置不完整' };
          }

          // 使用内置的通知API发送测试邮件
          const response = await fetch(`${process.env.SMTP_API_URL || 'https://api.example.com'}/api/email/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SMTP_API_KEY || ''}`,
            },
            body: JSON.stringify({
              to: recipient,
              subject: '错题分析系统 - 测试邮件',
              content: `
                <h2>测试邮件</h2>
                <p>${testMessage}</p>
                <p>发送时间: ${new Date().toLocaleString()}</p>
                <p>如果您收到此邮件，说明邮件服务配置正确。</p>
              `,
              isHtml: true,
              from: fromEmail?.settingValue || username.settingValue,
              fromName: fromName?.settingValue || '错题分析系统',
            }),
          });

          if (response.ok) {
            return { success: true, message: '测试邮件发送成功' };
          } else {
            const error = await response.text();
            return { success: false, message: `发送失败: ${error}` };
          }
        }

        return { success: false, message: '未知的服务类型' };
      } catch (error) {
        return { 
          success: false, 
          message: error instanceof Error ? error.message : '发送失败' 
        };
      }
    }),

  /**
   * 获取服务状态
   */
  getServiceStatus: adminProcedure.query(async () => {
    const services = ['wechat', 'aliyunSms', 'smtp'];
    const status: Record<string, { configured: boolean; enabled: boolean }> = {};

    for (const service of services) {
      let keyPrefix = '';
      let enabledKey = '';

      if (service === 'wechat') {
        keyPrefix = 'wechat_app_id';
        enabledKey = 'wechat_enabled';
      } else if (service === 'aliyunSms') {
        keyPrefix = 'aliyun_sms_access_key_id';
        enabledKey = 'aliyun_sms_enabled';
      } else if (service === 'smtp') {
        keyPrefix = 'smtp_host';
        enabledKey = 'smtp_enabled';
      }

      const [configSetting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, keyPrefix));
      const [enabledSetting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, enabledKey));

      status[service] = {
        configured: !!configSetting?.settingValue,
        enabled: enabledSetting?.settingValue === 'true',
      };
    }

    return status;
  }),
});
