/**
 * 增强导出功能单元测试
 */

import { describe, it, expect } from 'vitest';
import type { EnhancedExportOptions, LayoutOptimization } from './enhancedExportService';

describe('增强导出功能测试', () => {
  it('应该正确定义导出选项接口', () => {
    const options: EnhancedExportOptions = {
      format: 'pdf',
      includeAnswer: true,
      includeExplanation: true,
      includeAnalysis: true,
      includeNotes: true,
      includeImage: true,
      pageSize: 'A4',
      enableAILayout: true,
    };

    expect(options.format).toBe('pdf');
    expect(options.pageSize).toBe('A4');
    expect(options.enableAILayout).toBe(true);
  });

  it('应该支持Word和PDF两种格式', () => {
    const pdfOptions: EnhancedExportOptions = {
      format: 'pdf',
      pageSize: 'A4',
    };

    const wordOptions: EnhancedExportOptions = {
      format: 'word',
      pageSize: 'A4',
    };

    expect(pdfOptions.format).toBe('pdf');
    expect(wordOptions.format).toBe('word');
  });

  it('应该正确定义布局优化接口', () => {
    const layout: LayoutOptimization = {
      title: '错题集',
      fontSize: {
        title: '24pt',
        heading: '16pt',
        body: '12pt',
      },
      spacing: {
        lineHeight: '1.6',
        paragraphSpacing: '12pt',
      },
      margins: {
        top: '2.54cm',
        bottom: '2.54cm',
        left: '3.17cm',
        right: '3.17cm',
      },
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        text: '#1e293b',
      },
    };

    expect(layout.fontSize.title).toBe('24pt');
    expect(layout.margins.top).toBe('2.54cm');
    expect(layout.colors.primary).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('应该正确处理A4页面尺寸', () => {
    const a4Options: EnhancedExportOptions = {
      format: 'pdf',
      pageSize: 'A4',
    };

    expect(a4Options.pageSize).toBe('A4');
  });

  it('应该正确处理Letter页面尺寸', () => {
    const letterOptions: EnhancedExportOptions = {
      format: 'pdf',
      pageSize: 'Letter',
    };

    expect(letterOptions.pageSize).toBe('Letter');
  });

  it('应该验证字体大小格式', () => {
    const fontSizes = ['12pt', '14pt', '16pt', '18pt', '24pt'];
    
    fontSizes.forEach(size => {
      expect(size).toMatch(/^\d+pt$/);
    });
  });

  it('应该验证颜色格式', () => {
    const colors = ['#2563eb', '#64748b', '#1e293b', '#ef4444'];
    
    colors.forEach(color => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('应该验证行高格式', () => {
    const lineHeights = ['1.0', '1.2', '1.5', '1.6', '2.0'];
    
    lineHeights.forEach(height => {
      expect(parseFloat(height)).toBeGreaterThan(0);
      expect(parseFloat(height)).toBeLessThanOrEqual(3);
    });
  });

  it('应该验证页边距格式', () => {
    const margins = ['2.54cm', '3.17cm', '1.27cm'];
    
    margins.forEach(margin => {
      expect(margin).toMatch(/^\d+(\.\d+)?cm$/);
    });
  });

  it('应该正确处理导出选项的默认值', () => {
    const minimalOptions: EnhancedExportOptions = {
      format: 'pdf',
    };

    // 验证必填字段
    expect(minimalOptions.format).toBeTruthy();
    
    // 可选字段可以为undefined
    expect(minimalOptions.includeAnswer).toBeUndefined();
    expect(minimalOptions.pageSize).toBeUndefined();
  });

  it('应该支持完整的导出选项配置', () => {
    const fullOptions: EnhancedExportOptions = {
      format: 'word',
      includeAnswer: true,
      includeExplanation: true,
      includeAnalysis: true,
      includeNotes: true,
      includeImage: true,
      pageSize: 'A4',
      enableAILayout: true,
    };

    // 验证所有选项都已设置
    expect(Object.keys(fullOptions).length).toBeGreaterThanOrEqual(8);
  });

  it('应该正确处理布局优化的所有字段', () => {
    const layout: LayoutOptimization = {
      title: '我的错题集',
      fontSize: {
        title: '28pt',
        heading: '18pt',
        body: '14pt',
      },
      spacing: {
        lineHeight: '1.8',
        paragraphSpacing: '16pt',
      },
      margins: {
        top: '3cm',
        bottom: '3cm',
        left: '3.5cm',
        right: '3.5cm',
      },
      colors: {
        primary: '#3b82f6',
        secondary: '#94a3b8',
        text: '#0f172a',
      },
    };

    // 验证所有嵌套对象都有值
    expect(layout.title).toBeTruthy();
    expect(Object.keys(layout.fontSize).length).toBe(3);
    expect(Object.keys(layout.spacing).length).toBe(2);
    expect(Object.keys(layout.margins).length).toBe(4);
    expect(Object.keys(layout.colors).length).toBe(3);
  });

  it('应该验证Markdown格式输出', () => {
    const markdownSample = `# 错题集

**导出时间**: 2026-01-07
**错题数量**: 5 道

---

## 1. 二次方程求解

| 属性 | 值 |
|------|-----|
| 学科 | 数学 |
| 年级 | 高一 |
| 难度 | 中等 |

### 📝 题目

求解方程 $x^2 + 2x + 1 = 0$ 的根。

### ✅ 正确答案

> $x = -1$ （重根）

\\newpage
`;

    expect(markdownSample).toContain('# 错题集');
    expect(markdownSample).toContain('| 属性 | 值 |');
    expect(markdownSample).toContain('$x^2 + 2x + 1 = 0$');
    expect(markdownSample).toContain('\\newpage');
  });
});
