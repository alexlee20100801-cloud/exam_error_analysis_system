import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseDocument, parseImage, parseWord, parsePDF } from './documentParserService';
import * as storage from '../storage';
import * as llm from '../_core/llm';
import mammoth from 'mammoth';

// Mock dependencies
vi.mock('../storage');
vi.mock('../_core/llm');
vi.mock('mammoth');

describe('documentParserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseImage', () => {
    it('应该成功解析图片并返回结构化数据', async () => {
      // Mock storagePut
      vi.mocked(storage.storagePut).mockResolvedValue({
        key: 'test-key',
        url: 'https://example.com/test.jpg'
      });

      // Mock invokeLLM
      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: '测试题目',
                content: '这是一道测试题',
                userAnswer: 'A',
                correctAnswer: 'B',
                explanation: '正确答案是B',
                rawText: '原始文本',
                confidence: 0.9
              }),
              role: 'assistant'
            },
            index: 0,
            finish_reason: 'stop'
          }
        ],
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model'
      });

      const buffer = Buffer.from('fake-image-data');
      const result = await parseImage(buffer, 'image/jpeg');

      expect(result.fileType).toBe('image');
      expect(result.structuredData.title).toBe('测试题目');
      expect(result.structuredData.content).toBe('这是一道测试题');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('应该处理OCR识别失败的情况', async () => {
      vi.mocked(storage.storagePut).mockRejectedValue(new Error('Upload failed'));

      const buffer = Buffer.from('fake-image-data');
      
      await expect(parseImage(buffer, 'image/jpeg')).rejects.toThrow('图片识别失败，请重试');
    });
  });

  describe('parseWord', () => {
    it('应该成功解析Word文档', async () => {
      // Mock mammoth
      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: '这是Word文档的内容，包含题目和答案。',
        messages: []
      });

      // Mock invokeLLM for text analysis
      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'Word题目',
                content: '题目内容',
                correctAnswer: '答案',
                subject: 'math',
                difficulty: 'medium'
              }),
              role: 'assistant'
            },
            index: 0,
            finish_reason: 'stop'
          }
        ],
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model'
      });

      const buffer = Buffer.from('fake-word-data');
      const result = await parseWord(buffer);

      expect(result.fileType).toBe('word');
      expect(result.rawText).toContain('Word文档');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('应该处理空文档的情况', async () => {
      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: '',
        messages: []
      });

      const buffer = Buffer.from('fake-word-data');
      
      await expect(parseWord(buffer)).rejects.toThrow('Word文档解析失败');
    });
  });

  describe('parsePDF', () => {
    it('应该成功解析PDF文档', async () => {
      // Mock PDF parser
      const mockPDFParse = {
        getText: vi.fn().mockResolvedValue({
          text: '这是PDF文档的内容，包含题目和答案。'
        })
      };

      // Mock dynamic import of pdf-parse
      vi.doMock('pdf-parse', () => ({
        PDFParse: vi.fn(() => mockPDFParse)
      }));

      // Mock invokeLLM for text analysis
      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'PDF题目',
                content: '题目内容',
                correctAnswer: '答案'
              }),
              role: 'assistant'
            },
            index: 0,
            finish_reason: 'stop'
          }
        ],
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model'
      });

      const buffer = Buffer.from('fake-pdf-data');
      const result = await parsePDF(buffer);

      expect(result.fileType).toBe('pdf');
      expect(result.rawText).toContain('PDF文档');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('parseDocument', () => {
    it('应该根据MIME类型选择正确的解析方法', async () => {
      // Test image
      vi.mocked(storage.storagePut).mockResolvedValue({
        key: 'test-key',
        url: 'https://example.com/test.jpg'
      });

      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                rawText: 'test',
                confidence: 0.9
              }),
              role: 'assistant'
            },
            index: 0,
            finish_reason: 'stop'
          }
        ],
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model'
      });

      const buffer = Buffer.from('fake-data');
      
      const imageResult = await parseDocument(buffer, 'image/png');
      expect(imageResult.fileType).toBe('image');
    });

    it('应该拒绝不支持的文件类型', async () => {
      const buffer = Buffer.from('fake-data');
      
      await expect(parseDocument(buffer, 'application/zip')).rejects.toThrow('不支持的文件类型');
    });
  });
});
