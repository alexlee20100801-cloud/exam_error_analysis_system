import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getDb } from '../db';
import * as exportTemplateEnhancedService from './exportTemplateEnhancedService';

// Mock database for testing
vi.mock('../db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  })),
}));

describe('ExportTemplateEnhancedService', () => {
  describe('createExportTemplateEnhanced', () => {
    it('should create a new export template with valid data', async () => {
      const mockDb = getDb();
      
      // Setup mock to return created template
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 1,
              userId: 1,
              name: '测试模板',
              templateType: 'error_book',
              exportFormat: 'pdf',
              isDefault: false,
              isPublic: false,
              isSystemPreset: false,
              usageCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }]),
          }),
        }),
      });
      
      const result = await exportTemplateEnhancedService.createExportTemplateEnhanced(1, {
        name: '测试模板',
        templateType: 'error_book',
        exportFormat: 'pdf',
      });
      
      expect(result).toBeDefined();
      expect(result.name).toBe('测试模板');
      expect(result.templateType).toBe('error_book');
    });

    it('should reject template creation with empty name', async () => {
      await expect(
        exportTemplateEnhancedService.createExportTemplateEnhanced(1, {
          name: '',
          templateType: 'error_book',
          exportFormat: 'pdf',
        })
      ).rejects.toThrow();
    });
  });

  describe('getExportTemplatesEnhanced', () => {
    it('should return user templates', async () => {
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              { id: 1, name: '模板1', userId: 1 },
              { id: 2, name: '模板2', userId: 1 },
            ]),
          }),
        }),
      });
      
      const result = await exportTemplateEnhancedService.getExportTemplatesEnhanced(1);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('setDefaultTemplate', () => {
    it('should set a template as default', async () => {
      const mockDb = getDb();
      
      // Mock the update operations
      (mockDb.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      
      const result = await exportTemplateEnhancedService.setDefaultTemplate(1, 1);
      
      expect(result).toEqual({ success: true });
    });
  });

  describe('incrementUsageCount', () => {
    it('should increment template usage count', async () => {
      const mockDb = getDb();
      
      (mockDb.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      
      await expect(
        exportTemplateEnhancedService.incrementUsageCount(1)
      ).resolves.not.toThrow();
    });
  });
});

describe('QuickExportConfig', () => {
  describe('createQuickExportConfig', () => {
    it('should create a quick export config', async () => {
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 1,
              userId: 1,
              templateId: 1,
              name: '快捷导出',
              showInToolbar: true,
              displayOrder: 0,
            }]),
          }),
        }),
      });
      
      const result = await exportTemplateEnhancedService.createQuickExportConfig(1, {
        templateId: 1,
        name: '快捷导出',
      });
      
      expect(result).toBeDefined();
      expect(result.name).toBe('快捷导出');
    });
  });

  describe('getQuickExportConfigs', () => {
    it('should return user quick export configs', async () => {
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              { id: 1, name: '快捷1' },
              { id: 2, name: '快捷2' },
            ]),
          }),
        }),
      });
      
      const result = await exportTemplateEnhancedService.getQuickExportConfigs(1);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('ExportHistoryRecord', () => {
  describe('createExportHistoryRecord', () => {
    it('should create an export history record', async () => {
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 1,
              userId: 1,
              exportType: 'error_questions',
              exportFormat: 'pdf',
              status: 'pending',
            }]),
          }),
        }),
      });
      
      const result = await exportTemplateEnhancedService.createExportHistoryRecord(1, {
        exportType: 'error_questions',
        exportFormat: 'pdf',
      });
      
      expect(result).toBeDefined();
      expect(result.exportType).toBe('error_questions');
    });
  });

  describe('getExportHistory', () => {
    it('should return user export history', async () => {
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { id: 1, exportType: 'error_questions' },
                { id: 2, exportType: 'exam_paper' },
              ]),
            }),
          }),
        }),
      });
      
      const result = await exportTemplateEnhancedService.getExportHistory(1);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
