import { getDb } from "./db";
import { userCropTemplates, type UserCropTemplate, type NewUserCropTemplate } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * 创建自定义框选模板
 */
export async function createCropTemplate(data: NewUserCropTemplate): Promise<UserCropTemplate> {
  const db = getDb();
  const [template] = await db.insert(userCropTemplates).values(data).$returningId();
  
  const [created] = await db.select().from(userCropTemplates).where(eq(userCropTemplates.id, template.id));
  return created;
}

/**
 * 获取用户的所有框选模板
 */
export async function getUserCropTemplates(userId: number): Promise<UserCropTemplate[]> {
  const db = getDb();
  return await db.select()
    .from(userCropTemplates)
    .where(eq(userCropTemplates.userId, userId))
    .orderBy(desc(userCropTemplates.createdAt));
}

/**
 * 获取指定类别的模板
 */
export async function getCropTemplatesByCategory(
  userId: number,
  category: string
): Promise<UserCropTemplate[]> {
  const db = getDb();
  return await db.select()
    .from(userCropTemplates)
    .where(
      and(
        eq(userCropTemplates.userId, userId),
        // @ts-ignore
        sql`${userCropTemplates.category} = ${category}`
      )
    )
    .orderBy(desc(userCropTemplates.usageCount));
}

/**
 * 获取单个模板详情
 */
export async function getCropTemplateById(id: number, userId: number): Promise<UserCropTemplate | undefined> {
  const db = getDb();
  const [template] = await db.select()
    .from(userCropTemplates)
    .where(
      and(
        eq(userCropTemplates.id, id),
        eq(userCropTemplates.userId, userId)
      )
    );
  return template;
}

/**
 * 更新模板
 */
export async function updateCropTemplate(
  id: number,
  userId: number,
  data: Partial<NewUserCropTemplate>
): Promise<UserCropTemplate | undefined> {
  const db = getDb();
  await db.update(userCropTemplates)
    .set(data)
    .where(
      and(
        eq(userCropTemplates.id, id),
        eq(userCropTemplates.userId, userId)
      )
    );
  
  return await getCropTemplateById(id, userId);
}

/**
 * 删除模板
 */
export async function deleteCropTemplate(id: number, userId: number): Promise<boolean> {
  const db = getDb();
  const result = await db.delete(userCropTemplates)
    .where(
      and(
        eq(userCropTemplates.id, id),
        eq(userCropTemplates.userId, userId)
      )
    );
  return (result as any).rowsAffected > 0 || (result as any).length > 0;
}

/**
 * 增加模板使用次数
 */
export async function incrementTemplateUsage(id: number): Promise<void> {
  const db = getDb();
  const [template] = await db.select().from(userCropTemplates).where(eq(userCropTemplates.id, id));
  if (template) {
    await db.update(userCropTemplates)
      .set({ usageCount: template.usageCount + 1 })
      .where(eq(userCropTemplates.id, id));
  }
}

/**
 * 获取公共模板（用于分享）
 */
export async function getPublicCropTemplates(): Promise<UserCropTemplate[]> {
  const db = getDb();
  return await db.select()
    .from(userCropTemplates)
    .where(eq(userCropTemplates.isPublic, 1))
    .orderBy(desc(userCropTemplates.usageCount));
}
