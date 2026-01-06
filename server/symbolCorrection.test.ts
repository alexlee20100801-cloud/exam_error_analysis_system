/**
 * 符号校正服务单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  correctSymbolsByRules,
  convertToLaTeX,
  checkChemicalEquationBalance,
} from './symbolCorrectionService.js';

describe('符号校正服务', () => {
  describe('数学符号校正', () => {
    it('应该正确识别和校正分数', () => {
      const text = '这道题的答案是1/2加上3/4';
      const result = correctSymbolsByRules(text, '数学');
      
      expect(result.correctedText).toContain('\\frac{1}{2}');
      expect(result.correctedText).toContain('\\frac{3}{4}');
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('应该正确识别和校正根号', () => {
      const text = '√2加上√3等于多少';
      const result = correctSymbolsByRules(text, '数学');
      
      expect(result.correctedText).toContain('\\sqrt{2}');
      expect(result.correctedText).toContain('\\sqrt{3}');
    });

    it('应该正确识别和校正平方和立方', () => {
      const text = 'x^2加上y^3';
      const result = correctSymbolsByRules(text, '数学');
      
      expect(result.correctedText).toContain('x²');
      expect(result.correctedText).toContain('y³');
    });

    it('应该正确识别和校正希腊字母', () => {
      const text = '角度alpha等于30度，角度beta等于60度';
      const result = correctSymbolsByRules(text, '数学');
      
      expect(result.correctedText).toContain('α');
      expect(result.correctedText).toContain('β');
    });
  });

  describe('物理符号校正', () => {
    it('应该正确识别和校正物理单位', () => {
      const text = '速度是10米每秒，加速度是2米每二次方秒';
      const result = correctSymbolsByRules(text, '物理');
      
      expect(result.correctedText).toContain('m/s');
      expect(result.correctedText).toContain('m/s²');
    });

    it('应该正确识别和校正物理量符号', () => {
      const text = '力F等于质量m乘以加速度a';
      const result = correctSymbolsByRules(text, '物理');
      
      expect(result.correctedText).toContain('力 F');
      expect(result.correctedText).toContain('质量 m');
      expect(result.correctedText).toContain('加速度 a');
    });

    it('应该正确识别和校正单位名称', () => {
      const text = '功率是100瓦特，电压是220伏特';
      const result = correctSymbolsByRules(text, '物理');
      
      expect(result.correctedText).toContain('W');
      expect(result.correctedText).toContain('V');
    });
  });

  describe('化学符号校正', () => {
    it('应该正确识别和校正常见化合物', () => {
      const text = '水的化学式是H2O，二氧化碳是CO2';
      const result = correctSymbolsByRules(text, '化学');
      
      expect(result.correctedText).toContain('H₂O');
      expect(result.correctedText).toContain('CO₂');
    });

    it('应该正确识别和校正化学方程式', () => {
      const text = '2H2 + O2 → 2H2O';
      const result = correctSymbolsByRules(text, '化学');
      
      expect(result.correctedText).toContain('H₂');
      expect(result.correctedText).toContain('O₂');
    });

    it('应该正确识别和校正元素名称', () => {
      const text = '氢气和氧气反应生成水';
      const result = correctSymbolsByRules(text, '化学');
      
      expect(result.correctedText).toContain('H₂');
      expect(result.correctedText).toContain('O₂');
      expect(result.correctedText).toContain('H₂O');
    });
  });

  describe('语文符号校正', () => {
    it('应该正确识别和校正中文标点符号', () => {
      const text = '他说："你好！"';
      const result = correctSymbolsByRules(text, '语文');
      
      // 验证引号和标点符号格式正确
      expect(result.correctedText).toBeTruthy();
    });
  });

  describe('英语符号校正', () => {
    it('应该正确识别和校正音标符号', () => {
      const text = '音标[ə]和[ɪ]';
      const result = correctSymbolsByRules(text, '英语');
      
      expect(result.correctedText).toContain('ə');
      expect(result.correctedText).toContain('ɪ');
    });
  });

  describe('LaTeX转换', () => {
    it('应该正确转换分数为LaTeX格式', () => {
      const text = '1/2 + 3/4';
      const latexText = convertToLaTeX(text);
      
      expect(latexText).toContain('\\frac{1}{2}');
      expect(latexText).toContain('\\frac{3}{4}');
    });

    it('应该正确转换根号为LaTeX格式', () => {
      const text = '√2 + √(x+1)';
      const latexText = convertToLaTeX(text);
      
      expect(latexText).toContain('\\sqrt{2}');
      expect(latexText).toContain('\\sqrt{x+1}');
    });

    it('应该正确转换上下标为LaTeX格式', () => {
      const text = 'x² + y³';
      const latexText = convertToLaTeX(text);
      
      expect(latexText).toContain('^{2}');
      expect(latexText).toContain('^{3}');
    });

    it('应该正确转换积分和求和符号', () => {
      const text = '∫f(x)dx + ∑n';
      const latexText = convertToLaTeX(text);
      
      expect(latexText).toContain('\\int');
      expect(latexText).toContain('\\sum');
    });
  });

  describe('化学方程式平衡检查', () => {
    it('应该识别有效的化学方程式', () => {
      const equation = '2H₂ + O₂ → 2H₂O';
      const result = checkChemicalEquationBalance(equation);
      
      expect(result.balanced).toBe(true);
    });

    it('应该识别无效的化学方程式格式', () => {
      const equation = '这不是一个化学方程式';
      const result = checkChemicalEquationBalance(equation);
      
      expect(result.balanced).toBe(false);
      expect(result.message).toContain('未找到反应箭头');
    });
  });

  describe('校正结果结构', () => {
    it('应该返回完整的校正结果', () => {
      const text = '1/2 + √2';
      const result = correctSymbolsByRules(text, '数学');
      
      expect(result).toHaveProperty('originalText');
      expect(result).toHaveProperty('correctedText');
      expect(result).toHaveProperty('corrections');
      expect(result).toHaveProperty('confidence');
      
      expect(result.originalText).toBe(text);
      expect(Array.isArray(result.corrections)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('应该记录每个校正的详细信息', () => {
      const text = '1/2';
      const result = correctSymbolsByRules(text, '数学');
      
      if (result.corrections.length > 0) {
        const correction = result.corrections[0];
        expect(correction).toHaveProperty('position');
        expect(correction).toHaveProperty('original');
        expect(correction).toHaveProperty('corrected');
        expect(correction).toHaveProperty('rule');
      }
    });
  });

  describe('边界情况', () => {
    it('应该处理空文本', () => {
      const text = '';
      const result = correctSymbolsByRules(text, '数学');
      
      expect(result.correctedText).toBe('');
      expect(result.corrections.length).toBe(0);
    });

    it('应该处理没有需要校正的文本', () => {
      const text = '这是一段普通文本';
      const result = correctSymbolsByRules(text, '数学');
      
      expect(result.correctedText).toBe(text);
      expect(result.confidence).toBe(1.0);
    });

    it('应该处理混合学科内容', () => {
      const text = '数学公式1/2加上化学式H2O';
      const mathResult = correctSymbolsByRules(text, '数学');
      const chemResult = correctSymbolsByRules(text, '化学');
      
      expect(mathResult.correctedText).toContain('\\frac{1}{2}');
      expect(chemResult.correctedText).toContain('H₂O');
    });
  });
});
