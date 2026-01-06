import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, emailTemplates } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  initializeDefaultTemplates,
  getAllTemplates,
  getTemplateByType,
  saveTemplate,
  deleteTemplate,
  renderTemplate,
  replaceTemplateVariables,
  EMAIL_TEMPLATE_TYPES,
} from "./services/emailTemplateService";

describe("邮件模板管理功能测试", () => {
  let testAdminId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建测试管理员
    const [testAdmin] = await db.insert(users).values({
      openId: `test-template-admin-${Date.now()}`,
      name: "模板测试管理员",
      role: "admin",
      userType: "student",
    });
    testAdminId = testAdmin.insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    await db.delete(users).where(eq(users.id, testAdminId));
    // 清理测试创建的模板（保留默认模板）
    await db.delete(emailTemplates).where(eq(emailTemplates.isDefault, false));
  });

  describe("变量替换功能", () => {
    it("应该能够替换单个变量", () => {
      const template = "Hello {{userName}}!";
      const variables = { userName: "张三" };
      const result = replaceTemplateVariables(template, variables);
      expect(result).toBe("Hello 张三!");
    });

    it("应该能够替换多个变量", () => {
      const template = "{{userName}} 的邮箱是 {{userEmail}}";
      const variables = { userName: "张三", userEmail: "zhangsan@example.com" };
      const result = replaceTemplateVariables(template, variables);
      expect(result).toBe("张三 的邮箱是 zhangsan@example.com");
    });

    it("应该能够替换重复出现的变量", () => {
      const template = "{{userName}} says: Hello {{userName}}!";
      const variables = { userName: "张三" };
      const result = replaceTemplateVariables(template, variables);
      expect(result).toBe("张三 says: Hello 张三!");
    });

    it("应该能够处理数字变量", () => {
      const template = "过期时间：{{expiryHours}} 小时";
      const variables = { expiryHours: 24 };
      const result = replaceTemplateVariables(template, variables);
      expect(result).toBe("过期时间：24 小时");
    });
  });

  describe("默认模板初始化", () => {
    it("应该能够初始化默认模板", async () => {
      await initializeDefaultTemplates(testAdminId);

      const templates = await getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);

      // 验证每种类型的模板都已创建
      const types = Object.values(EMAIL_TEMPLATE_TYPES);
      for (const type of types) {
        const template = await getTemplateByType(type);
        expect(template).toBeDefined();
        expect(template?.isDefault).toBe(true);
        expect(template?.isActive).toBe(true);
      }
    });

    it("不应该重复创建已存在的默认模板", async () => {
      const beforeCount = (await getAllTemplates()).length;
      
      // 再次初始化
      await initializeDefaultTemplates(testAdminId);
      
      const afterCount = (await getAllTemplates()).length;
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe("模板CRUD操作", () => {
    it("应该能够创建自定义模板", async () => {
      const customTemplate = {
        templateType: "custom_test_template",
        name: "测试模板",
        description: "这是一个测试模板",
        subject: "测试邮件 - {{userName}}",
        htmlContent: "<p>Hello {{userName}}</p>",
        isDefault: false,
        isActive: true,
      };

      await saveTemplate(customTemplate, testAdminId);

      const saved = await getTemplateByType("custom_test_template");
      expect(saved).toBeDefined();
      expect(saved?.name).toBe("测试模板");
      expect(saved?.subject).toBe("测试邮件 - {{userName}}");
    });

    it("应该能够更新现有模板", async () => {
      const template = await getTemplateByType("custom_test_template");
      expect(template).toBeDefined();

      if (!template) return;

      await saveTemplate(
        {
          id: template.id,
          templateType: template.templateType,
          name: "更新后的测试模板",
          subject: "更新后的主题",
          htmlContent: template.htmlContent,
          isActive: true,
        },
        testAdminId
      );

      const updated = await getTemplateByType("custom_test_template");
      expect(updated?.name).toBe("更新后的测试模板");
      expect(updated?.subject).toBe("更新后的主题");
    });

    it("应该能够获取所有模板", async () => {
      const templates = await getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      // 验证包含默认模板和自定义模板
      const hasDefault = templates.some((t) => t.isDefault);
      const hasCustom = templates.some((t) => !t.isDefault);
      expect(hasDefault).toBe(true);
      expect(hasCustom).toBe(true);
    });

    it("应该能够删除非默认模板", async () => {
      const template = await getTemplateByType("custom_test_template");
      expect(template).toBeDefined();

      if (!template) return;

      await deleteTemplate(template.id);

      const deleted = await getTemplateByType("custom_test_template");
      expect(deleted).toBeNull();
    });

    it("不应该能够删除默认模板", async () => {
      const template = await getTemplateByType(EMAIL_TEMPLATE_TYPES.EMAIL_VERIFICATION);
      expect(template).toBeDefined();

      if (!template) return;

      await expect(deleteTemplate(template.id)).rejects.toThrow("不能删除系统默认模板");
    });
  });

  describe("模板渲染", () => {
    it("应该能够渲染邮箱验证模板", async () => {
      const variables = {
        userName: "张三",
        userEmail: "zhangsan@example.com",
        verificationUrl: "https://example.com/verify/token123",
        expiryHours: "24",
        systemName: "测试系统",
      };

      const rendered = await renderTemplate(EMAIL_TEMPLATE_TYPES.EMAIL_VERIFICATION, variables);
      expect(rendered).toBeDefined();
      expect(rendered?.subject).toContain("测试系统");
      expect(rendered?.htmlContent).toContain("张三");
      expect(rendered?.htmlContent).toContain("https://example.com/verify/token123");
      expect(rendered?.htmlContent).toContain("24");
    });

    it("应该能够渲染复习提醒模板", async () => {
      const variables = {
        userName: "李四",
        taskTitle: "数学复习",
        taskDescription: "复习函数知识点",
        scheduledDate: "2024-01-15 14:00",
        taskUrl: "https://example.com/tasks/123",
        systemName: "测试系统",
      };

      const rendered = await renderTemplate(EMAIL_TEMPLATE_TYPES.REVIEW_REMINDER, variables);
      expect(rendered).toBeDefined();
      expect(rendered?.subject).toContain("数学复习");
      expect(rendered?.htmlContent).toContain("李四");
      expect(rendered?.htmlContent).toContain("函数知识点");
      expect(rendered?.htmlContent).toContain("2024-01-15 14:00");
    });

    it("应该能够渲染系统通知模板", async () => {
      const variables = {
        userName: "王五",
        notificationTitle: "系统升级通知",
        notificationContent: "系统将于今晚维护",
        actionUrl: "https://example.com/notifications",
        systemName: "测试系统",
      };

      const rendered = await renderTemplate(EMAIL_TEMPLATE_TYPES.SYSTEM_NOTIFICATION, variables);
      expect(rendered).toBeDefined();
      expect(rendered?.subject).toContain("系统升级通知");
      expect(rendered?.htmlContent).toContain("王五");
      expect(rendered?.htmlContent).toContain("系统将于今晚维护");
    });

    it("应该能够渲染欢迎邮件模板", async () => {
      const variables = {
        userName: "赵六",
        userEmail: "zhaoliu@example.com",
        loginUrl: "https://example.com/login",
        systemName: "测试系统",
      };

      const rendered = await renderTemplate(EMAIL_TEMPLATE_TYPES.WELCOME, variables);
      expect(rendered).toBeDefined();
      expect(rendered?.subject).toContain("测试系统");
      expect(rendered?.htmlContent).toContain("赵六");
      expect(rendered?.htmlContent).toContain("zhaoliu@example.com");
    });

    it("渲染不存在的模板应该返回null", async () => {
      const rendered = await renderTemplate("non_existent_template", {});
      expect(rendered).toBeNull();
    });
  });

  describe("模板状态管理", () => {
    it("应该能够禁用模板", async () => {
      // 创建测试模板
      await saveTemplate(
        {
          templateType: "status_test_template",
          name: "状态测试模板",
          subject: "测试",
          htmlContent: "<p>测试</p>",
          isActive: true,
        },
        testAdminId
      );

      // 禁用模板
      const template = await getTemplateByType("status_test_template");
      if (!template) throw new Error("模板未找到");

      await saveTemplate(
        {
          id: template.id,
          templateType: template.templateType,
          name: template.name,
          subject: template.subject,
          htmlContent: template.htmlContent,
          isActive: false,
        },
        testAdminId
      );

      // 验证已禁用（getTemplateByType只返回启用的模板）
      const disabled = await getTemplateByType("status_test_template");
      expect(disabled).toBeNull();

      // 清理
      const db = await getDb();
      if (db) {
        await db.delete(emailTemplates).where(eq(emailTemplates.id, template.id));
      }
    });
  });
});
