import { describe, it, expect, beforeAll } from "vitest";
import {
  createCropTemplate,
  getUserCropTemplates,
  getCropTemplatesByCategory,
  getCropTemplateById,
  updateCropTemplate,
  deleteCropTemplate,
  incrementTemplateUsage,
} from "./cropTemplatesService";

describe("cropTemplatesService", () => {
  let testUserId: number;
  let testTemplateId: number;

  beforeAll(() => {
    // 使用测试用户ID
    testUserId = 1;
  });

  it("should create a new crop template", async () => {
    const template = await createCropTemplate({
      userId: testUserId,
      templateName: "选择题模板",
      description: "适用于标准选择题的框选模板",
      regions: [
        { x: 10, y: 10, width: 200, height: 50, label: "题目" },
        { x: 10, y: 70, width: 200, height: 100, label: "选项" },
      ],
      category: "choice",
    });

    expect(template).toBeDefined();
    expect(template.templateName).toBe("选择题模板");
    expect(template.category).toBe("choice");
    testTemplateId = template.id;
  });

  it("should get user crop templates", async () => {
    const templates = await getUserCropTemplates(testUserId);
    expect(templates).toBeDefined();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
  });

  it("should get templates by category", async () => {
    const templates = await getCropTemplatesByCategory(testUserId, "choice");
    expect(templates).toBeDefined();
    expect(Array.isArray(templates)).toBe(true);
    if (templates.length > 0) {
      expect(templates[0].category).toBe("choice");
    }
  });

  it("should get template by id", async () => {
    const template = await getCropTemplateById(testTemplateId, testUserId);
    expect(template).toBeDefined();
    expect(template?.id).toBe(testTemplateId);
  });

  it("should update template", async () => {
    const updated = await updateCropTemplate(testTemplateId, testUserId, {
      templateName: "更新后的选择题模板",
      description: "更新后的描述",
    });
    expect(updated).toBeDefined();
    expect(updated?.templateName).toBe("更新后的选择题模板");
  });

  it("should increment template usage", async () => {
    const before = await getCropTemplateById(testTemplateId, testUserId);
    const usageCountBefore = before?.usageCount || 0;

    await incrementTemplateUsage(testTemplateId);

    const after = await getCropTemplateById(testTemplateId, testUserId);
    expect(after?.usageCount).toBe(usageCountBefore + 1);
  });

  it("should delete template", async () => {
    const success = await deleteCropTemplate(testTemplateId, testUserId);
    expect(success).toBe(true);

    const deleted = await getCropTemplateById(testTemplateId, testUserId);
    expect(deleted).toBeUndefined();
  });
});
