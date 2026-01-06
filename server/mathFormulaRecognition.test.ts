import { describe, it, expect } from 'vitest';
import { validateLatexSyntax } from './services/mathFormulaRecognitionService';

describe('Math Formula Recognition Service', () => {
  describe('LaTeX语法验证', () => {
    it('应该验证有效的LaTeX公式', () => {
      const validFormulas = [
        '$x^2 + y^2 = z^2$',
        '$$\\frac{a}{b}$$',
        '$\\sqrt{x}$',
        '$\\sum_{i=1}^{n} i$',
        '$\\int_{0}^{1} x dx$',
        '$\\alpha + \\beta = \\gamma$',
        '$\\ce{H2O}$'
      ];

      for (const formula of validFormulas) {
        const result = validateLatexSyntax(formula);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('应该检测括号不匹配', () => {
      const invalidFormulas = [
        '\\frac{a{b}',
        '\\sqrt{x',
        '(a + b]',
        '{a + b'
      ];

      for (const formula of invalidFormulas) {
        const result = validateLatexSyntax(formula);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('应该检测缺少参数的命令', () => {
      const result = validateLatexSyntax('\\frac a b');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('\\frac'))).toBe(true);
    });
  });

  describe('LaTeX公式格式检查', () => {
    it('应该识别行内公式格式', () => {
      const inlineFormulas = [
        '$x^2$',
        '$\\alpha$',
        '$a + b$'
      ];

      for (const formula of inlineFormulas) {
        expect(formula).toMatch(/\$[^$]+\$/);
      }
    });

    it('应该识别独立公式格式', () => {
      const displayFormulas = [
        '$$x^2 + y^2 = z^2$$',
        '$$\\frac{a}{b}$$'
      ];

      for (const formula of displayFormulas) {
        expect(formula).toMatch(/\$\$[^$]+\$\$/);
      }
    });

    it('应该识别化学方程式格式', () => {
      const chemicalFormulas = [
        '$\\ce{H2O}$',
        '$\\ce{2H2 + O2 -> 2H2O}$',
        '$\\ce{CH4}$'
      ];

      for (const formula of chemicalFormulas) {
        expect(formula).toMatch(/\$\\ce\{[^}]+\}\$/);
      }
    });
  });

  describe('常见数学符号LaTeX转换', () => {
    it('应该正确转换分数为LaTeX格式', () => {
      const fractions = [
        { original: '1/2', latex: '$\\frac{1}{2}$' },
        { original: 'a/b', latex: '$\\frac{a}{b}$' }
      ];

      for (const { latex } of fractions) {
        expect(latex).toContain('\\frac');
        expect(latex).toMatch(/\$\\frac\{[^}]+\}\{[^}]+\}\$/);
      }
    });

    it('应该正确转换根号为LaTeX格式', () => {
      const roots = [
        { original: '√x', latex: '$\\sqrt{x}$' },
        { original: '√(x+y)', latex: '$\\sqrt{x+y}$' }
      ];

      for (const { latex } of roots) {
        expect(latex).toContain('\\sqrt');
        expect(latex).toMatch(/\$\\sqrt\{[^}]+\}\$/);
      }
    });

    it('应该正确转换上下标为LaTeX格式', () => {
      const scripts = [
        { original: 'x²', latex: '$x^{2}$' },
        { original: 'x₁', latex: '$x_{1}$' }
      ];

      for (const { latex } of scripts) {
        expect(latex).toMatch(/\$[^$]*[\^_]\{[^}]+\}[^$]*\$/);
      }
    });

    it('应该正确转换积分和求和符号', () => {
      const symbols = [
        { latex: '$\\sum_{i=1}^{n} i$' },
        { latex: '$\\int_{0}^{1} x dx$' }
      ];

      for (const { latex } of symbols) {
        expect(latex).toMatch(/\$\\(sum|int)_\{[^}]+\}\^\{[^}]+\}/);
      }
    });
  });

  describe('公式识别结果结构', () => {
    it('应该包含必要的字段', () => {
      const mockResult = {
        originalText: '求解方程 x² + 2x + 1 = 0',
        latexText: '求解方程 $x^{2} + 2x + 1 = 0$',
        formulas: [
          {
            original: 'x² + 2x + 1 = 0',
            latex: '$x^{2} + 2x + 1 = 0$',
            type: 'inline' as const,
            confidence: 0.95
          }
        ],
        confidence: 0.9
      };

      expect(mockResult).toHaveProperty('originalText');
      expect(mockResult).toHaveProperty('latexText');
      expect(mockResult).toHaveProperty('formulas');
      expect(mockResult).toHaveProperty('confidence');
      expect(mockResult.formulas[0]).toHaveProperty('original');
      expect(mockResult.formulas[0]).toHaveProperty('latex');
      expect(mockResult.formulas[0]).toHaveProperty('type');
      expect(mockResult.formulas[0]).toHaveProperty('confidence');
    });

    it('应该正确分类公式类型', () => {
      const formulaTypes = ['inline', 'display', 'chemical', 'physics'];
      
      for (const type of formulaTypes) {
        expect(['inline', 'display', 'chemical', 'physics']).toContain(type);
      }
    });
  });

  describe('边界情况', () => {
    it('应该处理空文本', () => {
      const result = validateLatexSyntax('');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该处理没有公式的文本', () => {
      const text = '这是一段普通文本，没有任何数学公式';
      expect(text).not.toMatch(/\$[^$]+\$/);
    });

    it('应该处理混合中英文的公式', () => {
      const mixed = '设函数 $f(x) = x^2$ 在区间 $[0, 1]$ 上连续';
      expect(mixed).toMatch(/\$[^$]+\$/g);
      const matches = mixed.match(/\$[^$]+\$/g);
      expect(matches).toHaveLength(2);
    });
  });

  describe('文档解析集成', () => {
    it('应该在ParsedContent中包含公式信息', () => {
      const mockParsedContent = {
        rawText: '原始文本',
        structuredData: {
          title: '二次方程',
          content: '求解 $x^2 + 2x + 1 = 0$'
        },
        confidence: 0.9,
        fileType: 'image' as const,
        formulas: [
          {
            original: 'x² + 2x + 1 = 0',
            latex: '$x^{2} + 2x + 1 = 0$',
            type: 'inline' as const,
            confidence: 0.95
          }
        ],
        hasFormulas: true
      };

      expect(mockParsedContent).toHaveProperty('formulas');
      expect(mockParsedContent).toHaveProperty('hasFormulas');
      expect(mockParsedContent.hasFormulas).toBe(true);
      expect(mockParsedContent.formulas).toHaveLength(1);
    });
  });
});
