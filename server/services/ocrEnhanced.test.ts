import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as ocrEnhancedService from './ocrEnhancedService';

// Mock database
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
  })),
}));

// Mock LLM
vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          detected: true,
          confidence: 85,
          coordinates: {
            topLeft: { x: 0.05, y: 0.05 },
            topRight: { x: 0.95, y: 0.05 },
            bottomRight: { x: 0.95, y: 0.95 },
            bottomLeft: { x: 0.05, y: 0.95 },
          },
          needsPerspectiveCorrection: false,
          estimatedWidth: 800,
          estimatedHeight: 600,
        }),
      },
    }],
  }),
}));

// Mock storage
vi.mock('../storage', () => ({
  storagePut: vi.fn().mockResolvedValue({ url: 'https://example.com/image.jpg', key: 'test-key' }),
}));

describe('OcrEnhancedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectBorder', () => {
    it('should detect border in image', async () => {
      const { getDb } = await import('../db');
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 1,
              userId: 1,
              originalImageUrl: 'https://example.com/test.jpg',
              detectionStatus: 'detected',
              borderCoordinates: {
                topLeft: { x: 0.05, y: 0.05 },
                topRight: { x: 0.95, y: 0.05 },
                bottomRight: { x: 0.95, y: 0.95 },
                bottomLeft: { x: 0.05, y: 0.95 },
              },
              detectionConfidence: 85,
            }]),
          }),
        }),
      });
      
      const result = await ocrEnhancedService.detectBorder(
        1,
        'https://example.com/test.jpg'
      );
      
      expect(result).toBeDefined();
      expect(result.detectionStatus).toBe('detected');
      expect(result.detectionConfidence).toBe(85);
    });

    it('should handle detection failure gracefully', async () => {
      const { invokeLLM } = await import('../_core/llm');
      (invokeLLM as any).mockRejectedValueOnce(new Error('API Error'));
      
      const { getDb } = await import('../db');
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 1,
              userId: 1,
              detectionStatus: 'failed',
              errorMessage: 'API Error',
            }]),
          }),
        }),
      });
      
      const result = await ocrEnhancedService.detectBorder(
        1,
        'https://example.com/test.jpg'
      );
      
      expect(result).toBeDefined();
      expect(result.detectionStatus).toBe('failed');
    });
  });

  describe('generateCropSuggestion', () => {
    it('should generate crop suggestion for detected border', async () => {
      const borderRecord = {
        id: 1,
        userId: 1,
        originalImageUrl: 'https://example.com/test.jpg',
        originalImageKey: null,
        originalWidth: 800,
        originalHeight: 600,
        detectionStatus: 'detected' as const,
        borderCoordinates: {
          topLeft: { x: 0.1, y: 0.1 },
          topRight: { x: 0.9, y: 0.1 },
          bottomRight: { x: 0.9, y: 0.9 },
          bottomLeft: { x: 0.1, y: 0.9 },
        },
        detectionConfidence: 85,
        croppedImageUrl: null,
        croppedImageKey: null,
        croppedWidth: null,
        croppedHeight: null,
        perspectiveCorrected: false,
        processingTimeMs: 1000,
        errorMessage: null,
        createdAt: new Date(),
      };
      
      const result = await ocrEnhancedService.generateCropSuggestion(borderRecord);
      
      expect(result.shouldCrop).toBe(true);
      expect(result.cropRegion).toBeDefined();
      expect(result.confidence).toBe(85);
    });

    it('should return no crop for undetected border', async () => {
      const borderRecord = {
        id: 1,
        userId: 1,
        originalImageUrl: 'https://example.com/test.jpg',
        originalImageKey: null,
        originalWidth: null,
        originalHeight: null,
        detectionStatus: 'not_found' as const,
        borderCoordinates: null,
        detectionConfidence: null,
        croppedImageUrl: null,
        croppedImageKey: null,
        croppedWidth: null,
        croppedHeight: null,
        perspectiveCorrected: false,
        processingTimeMs: 500,
        errorMessage: null,
        createdAt: new Date(),
      };
      
      const result = await ocrEnhancedService.generateCropSuggestion(borderRecord);
      
      expect(result.shouldCrop).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('enhanceHandwritingRecognition', () => {
    it('should enhance handwriting recognition', async () => {
      const { invokeLLM } = await import('../_core/llm');
      (invokeLLM as any).mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              recognizedText: '这是一道数学题',
              confidence: 90,
              specialSymbols: {
                mathSymbols: ['∫', '∑'],
                chemicalFormulas: [],
                greekLetters: ['α', 'β'],
                other: [],
              },
              handwritingQuality: {
                clarity: 'clear',
                slant: 'upright',
                consistency: 'high',
                suggestions: ['书写清晰'],
              },
            }),
          },
        }],
      });
      
      const { getDb } = await import('../db');
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 1,
              userId: 1,
              imageUrl: 'https://example.com/test.jpg',
              recognitionStatus: 'completed',
              enhancedOcrText: '这是一道数学题',
              enhancedOcrConfidence: '90',
            }]),
          }),
        }),
      });
      
      const result = await ocrEnhancedService.enhanceHandwritingRecognition(
        1,
        'https://example.com/test.jpg',
        undefined,
        { subject: 'math', mathSymbolEnhancement: true }
      );
      
      expect(result).toBeDefined();
      expect(result.recognitionStatus).toBe('completed');
    });
  });

  describe('processImageWithEnhancement', () => {
    it('should process image with all enhancements', async () => {
      const { getDb } = await import('../db');
      const mockDb = getDb();
      
      // Mock for border detection
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 1,
              detectionStatus: 'detected',
              borderCoordinates: {
                topLeft: { x: 0.1, y: 0.1 },
                topRight: { x: 0.9, y: 0.1 },
                bottomRight: { x: 0.9, y: 0.9 },
                bottomLeft: { x: 0.1, y: 0.9 },
              },
              detectionConfidence: 85,
            }]),
          }),
        }),
      });
      
      const result = await ocrEnhancedService.processImageWithEnhancement(
        1,
        'https://example.com/test.jpg',
        undefined,
        {
          autoBorderDetection: true,
          handwritingMode: true,
          subject: 'math',
        }
      );
      
      expect(result.success).toBe(true);
    });
  });
});

describe('OcrConfig', () => {
  describe('getUserOcrConfig', () => {
    it('should return null when config not found', async () => {
      const result = await ocrEnhancedService.getUserOcrConfig(999);
      
      expect(result).toBeNull();
    });
  });

  describe('upsertOcrConfig', () => {
    it('should create config when not exists', async () => {
      const { getDb } = await import('../db');
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn()
              .mockResolvedValueOnce([]) // First call for check
              .mockResolvedValueOnce([{  // Second call for return
                id: 1,
                userId: 1,
                autoBorderDetection: true,
                handwritingMode: true,
              }]),
          }),
        }),
      });
      
      const result = await ocrEnhancedService.upsertOcrConfig(1, {
        autoBorderDetection: true,
        handwritingMode: true,
      });
      
      expect(result).toBeDefined();
    });
  });
});

describe('OcrBatch', () => {
  describe('createOcrBatch', () => {
    it('should create a batch processing task', async () => {
      const { getDb } = await import('../db');
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 1,
              userId: 1,
              batchName: '测试批次',
              totalImages: 10,
              status: 'pending',
            }]),
          }),
        }),
      });
      
      const result = await ocrEnhancedService.createOcrBatch(
        1,
        '测试批次',
        10,
        { autoBorderDetection: true }
      );
      
      expect(result).toBeDefined();
      expect(result.batchName).toBe('测试批次');
      expect(result.totalImages).toBe(10);
    });
  });

  describe('updateBatchProgress', () => {
    it('should update batch progress', async () => {
      await expect(
        ocrEnhancedService.updateBatchProgress(1, {
          processedImages: 5,
          successfulImages: 4,
          failedImages: 1,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getUserOcrBatches', () => {
    it('should return user batches', async () => {
      const result = await ocrEnhancedService.getUserOcrBatches(1);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('OcrStatistics', () => {
  describe('getOcrStatistics', () => {
    it('should return statistics', async () => {
      const { getDb } = await import('../db');
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            total: 100,
            successful: 85,
            avgConfidence: 88.5,
            totalImages: 500,
          }]),
        }),
      });
      
      const result = await ocrEnhancedService.getOcrStatistics(1);
      
      expect(result).toBeDefined();
      expect(typeof result.totalBorderDetections).toBe('number');
      expect(typeof result.successfulDetections).toBe('number');
    });
  });
});
