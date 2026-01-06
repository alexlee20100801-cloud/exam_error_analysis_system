/**
 * LaTeX公式快捷键配置系统
 * 支持自定义快捷键映射和持久化存储
 */

export interface LatexShortcut {
  id: string;
  name: string;
  description: string;
  defaultKey: string; // 例如: "Ctrl+Shift+F"
  template: string; // LaTeX模板，使用|表示光标位置
  category: 'basic' | 'greek' | 'operator' | 'advanced';
}

// 默认快捷键配置
export const DEFAULT_LATEX_SHORTCUTS: LatexShortcut[] = [
  // 基础运算
  {
    id: 'fraction',
    name: '分数',
    description: '插入分数公式',
    defaultKey: 'Ctrl+Shift+F',
    template: '\\frac{|}{  }',
    category: 'basic',
  },
  {
    id: 'sqrt',
    name: '平方根',
    description: '插入平方根',
    defaultKey: 'Ctrl+Shift+R',
    template: '\\sqrt{|}',
    category: 'basic',
  },
  {
    id: 'nth-root',
    name: 'n次根',
    description: '插入n次根',
    defaultKey: 'Ctrl+Shift+N',
    template: '\\sqrt[|]{  }',
    category: 'basic',
  },
  {
    id: 'superscript',
    name: '上标',
    description: '插入上标',
    defaultKey: 'Ctrl+Shift+U',
    template: '^{|}',
    category: 'basic',
  },
  {
    id: 'subscript',
    name: '下标',
    description: '插入下标',
    defaultKey: 'Ctrl+Shift+D',
    template: '_{|}',
    category: 'basic',
  },
  
  // 希腊字母（常用）
  {
    id: 'alpha',
    name: 'α (alpha)',
    description: '插入希腊字母α',
    defaultKey: 'Ctrl+Shift+A',
    template: '\\alpha|',
    category: 'greek',
  },
  {
    id: 'beta',
    name: 'β (beta)',
    description: '插入希腊字母β',
    defaultKey: 'Ctrl+Shift+B',
    template: '\\beta|',
    category: 'greek',
  },
  {
    id: 'theta',
    name: 'θ (theta)',
    description: '插入希腊字母θ',
    defaultKey: 'Ctrl+Shift+T',
    template: '\\theta|',
    category: 'greek',
  },
  {
    id: 'pi',
    name: 'π (pi)',
    description: '插入希腊字母π',
    defaultKey: 'Ctrl+Shift+P',
    template: '\\pi|',
    category: 'greek',
  },
  
  // 运算符
  {
    id: 'sum',
    name: '求和',
    description: '插入求和符号',
    defaultKey: 'Ctrl+Shift+S',
    template: '\\sum_{|}^{  }',
    category: 'operator',
  },
  {
    id: 'integral',
    name: '积分',
    description: '插入积分符号',
    defaultKey: 'Ctrl+Shift+I',
    template: '\\int_{|}^{  }',
    category: 'operator',
  },
  {
    id: 'limit',
    name: '极限',
    description: '插入极限',
    defaultKey: 'Ctrl+Shift+L',
    template: '\\lim_{|\\to  }',
    category: 'operator',
  },
  
  // 高级
  {
    id: 'matrix-2x2',
    name: '2x2矩阵',
    description: '插入2x2矩阵',
    defaultKey: 'Ctrl+Shift+M',
    template: '\\begin{pmatrix}|&\\\\&\\end{pmatrix}',
    category: 'advanced',
  },
];

// 快捷键存储key
const STORAGE_KEY = 'latex_shortcuts_config';

/**
 * 快捷键配置管理器
 */
export class LatexShortcutManager {
  private shortcuts: Map<string, LatexShortcut>;
  private keyMap: Map<string, string>; // key -> shortcutId

  constructor() {
    this.shortcuts = new Map();
    this.keyMap = new Map();
    this.loadShortcuts();
  }

  /**
   * 从localStorage加载快捷键配置
   */
  private loadShortcuts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        config.forEach((shortcut: LatexShortcut) => {
          this.shortcuts.set(shortcut.id, shortcut);
          this.keyMap.set(this.normalizeKey(shortcut.defaultKey), shortcut.id);
        });
      } else {
        // 使用默认配置
        this.resetToDefaults();
      }
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
      this.resetToDefaults();
    }
  }

  /**
   * 保存快捷键配置到localStorage
   */
  private saveShortcuts() {
    try {
      const config = Array.from(this.shortcuts.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save shortcuts:', error);
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults() {
    this.shortcuts.clear();
    this.keyMap.clear();
    DEFAULT_LATEX_SHORTCUTS.forEach((shortcut) => {
      this.shortcuts.set(shortcut.id, { ...shortcut });
      this.keyMap.set(this.normalizeKey(shortcut.defaultKey), shortcut.id);
    });
    this.saveShortcuts();
  }

  /**
   * 标准化快捷键字符串
   */
  private normalizeKey(key: string): string {
    return key
      .split('+')
      .map((k) => k.trim().toLowerCase())
      .sort()
      .join('+');
  }

  /**
   * 获取所有快捷键
   */
  getAllShortcuts(): LatexShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * 根据快捷键获取模板
   */
  getTemplateByKey(key: string): string | null {
    const normalizedKey = this.normalizeKey(key);
    const shortcutId = this.keyMap.get(normalizedKey);
    if (shortcutId) {
      const shortcut = this.shortcuts.get(shortcutId);
      return shortcut?.template || null;
    }
    return null;
  }

  /**
   * 更新快捷键配置
   */
  updateShortcut(id: string, newKey: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    // 检查新快捷键是否已被使用
    const normalizedNewKey = this.normalizeKey(newKey);
    const existingId = this.keyMap.get(normalizedNewKey);
    if (existingId && existingId !== id) {
      throw new Error(`快捷键 ${newKey} 已被 ${this.shortcuts.get(existingId)?.name} 使用`);
    }

    // 移除旧的映射
    const oldKey = this.normalizeKey(shortcut.defaultKey);
    this.keyMap.delete(oldKey);

    // 更新快捷键
    shortcut.defaultKey = newKey;
    this.keyMap.set(normalizedNewKey, id);

    this.saveShortcuts();
    return true;
  }

  /**
   * 检查快捷键是否冲突
   */
  isKeyConflict(key: string, excludeId?: string): boolean {
    const normalizedKey = this.normalizeKey(key);
    const existingId = this.keyMap.get(normalizedKey);
    return existingId !== undefined && existingId !== excludeId;
  }

  /**
   * 获取按分类分组的快捷键
   */
  getShortcutsByCategory(): Record<string, LatexShortcut[]> {
    const grouped: Record<string, LatexShortcut[]> = {
      basic: [],
      greek: [],
      operator: [],
      advanced: [],
    };

    this.shortcuts.forEach((shortcut) => {
      grouped[shortcut.category].push(shortcut);
    });

    return grouped;
  }
}

// 导出单例实例
export const latexShortcutManager = new LatexShortcutManager();
