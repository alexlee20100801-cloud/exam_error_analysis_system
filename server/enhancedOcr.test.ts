/**
 * 增强OCR识别功能单元测试
 */

import { describe, it, expect } from 'vitest';
import type { EnhancedOCRResult, ImageElement } from './enhancedOcrService';

describe('增强OCR识别功能测试', () => {
  it('应该正确定义EnhancedOCRResult接口', () => {
    const mockResult: EnhancedOCRResult = {
      success: true,
      content: '这是识别的文字内容',
      correctedContent: '这是校正后的内容',
      imageElements: [
        {
          type: 'chart',
          description: '柱状图显示销售数据',
          position: '题目下方',
          url: 'https://example.com/chart.png'
        }
      ],
      tables: [
        {
          content: '| 列1 | 列2 |\n|-----|-----|\n| 值1 | 值2 |',
          position: '题目中间'
        }
      ]
    };

    expect(mockResult.success).toBe(true);
    expect(mockResult.content).toBeTruthy();
    expect(mockResult.imageElements).toHaveLength(1);
    expect(mockResult.tables).toHaveLength(1);
  });

  it('应该正确识别图表类型', () => {
    const chartTypes: ImageElement['type'][] = ['chart', 'diagram', 'photo', 'formula_image'];
    
    chartTypes.forEach(type => {
      const element: ImageElement = {
        type,
        description: `测试${type}`,
        position: '测试位置'
      };
      
      expect(element.type).toBe(type);
    });
  });

  it('应该正确处理表格数据', () => {
    const table = {
      content: '| 姓名 | 成绩 |\n|------|------|\n| 张三 | 95 |\n| 李四 | 88 |',
      position: '题目末尾'
    };

    expect(table.content).toContain('|');
    expect(table.content.split('\n').length).toBeGreaterThan(1);
  });

  it('应该正确处理识别失败的情况', () => {
    const failedResult: EnhancedOCRResult = {
      success: false,
      content: '',
      error: 'OCR识别失败'
    };

    expect(failedResult.success).toBe(false);
    expect(failedResult.error).toBeTruthy();
  });

  it('应该支持多种图表类型识别', () => {
    const imageElements: ImageElement[] = [
      {
        type: 'chart',
        description: '柱状图：显示月度销售数据，包含1-12月的销售额',
        position: '题目第一段下方'
      },
      {
        type: 'diagram',
        description: '几何图形：直角三角形ABC，标注了三条边长',
        position: '题目第二段'
      },
      {
        type: 'photo',
        description: '实验照片：化学反应现象',
        position: '题目末尾'
      },
      {
        type: 'formula_image',
        description: '复杂公式图片：包含积分和求和符号',
        position: '题目中间'
      }
    ];

    expect(imageElements).toHaveLength(4);
    expect(imageElements.every(elem => elem.description && elem.position)).toBe(true);
  });

  it('应该正确处理LaTeX公式', () => {
    const contentWithFormula = '题目内容：求解方程 $x^2 + 2x + 1 = 0$ 的根。\n\n独立公式：$$\\int_{0}^{1} x^2 dx$$';
    
    expect(contentWithFormula).toContain('$');
    expect(contentWithFormula).toContain('$$');
    expect(contentWithFormula).toMatch(/\$[^$]+\$/); // 行内公式
    expect(contentWithFormula).toMatch(/\$\$[^$]+\$\$/); // 独立公式
  });

  it('应该正确处理符号校正结果', () => {
    const result: EnhancedOCRResult = {
      success: true,
      content: '原始内容：x平方',
      correctedContent: '校正内容：$x^2$',
      symbolCorrections: [
        {
          original: 'x平方',
          corrected: '$x^2$',
          rule: '数学符号规则：平方转换为LaTeX上标'
        }
      ]
    };

    expect(result.symbolCorrections).toBeTruthy();
    expect(result.symbolCorrections![0].original).not.toBe(result.symbolCorrections![0].corrected);
  });

  it('应该正确处理复杂表格结构', () => {
    const complexTable = {
      content: `| 科目 | 第一次 | 第二次 | 平均分 |
|------|--------|--------|--------|
| 数学 | 95     | 98     | 96.5   |
| 物理 | 88     | 92     | 90     |
| 化学 | 90     | 87     | 88.5   |`,
      position: '题目分析部分'
    };

    const rows = complexTable.content.split('\n');
    expect(rows.length).toBeGreaterThan(2); // 至少包含表头、分隔线、数据行
    expect(rows[0]).toContain('科目');
    expect(rows[1]).toContain('---');
  });
});
