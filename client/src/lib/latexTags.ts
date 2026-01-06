/**
 * LaTeX公式标签管理系统
 * 支持为历史公式和模板添加自定义标签
 */

export interface LatexTag {
  id: string;
  name: string;
  color: string; // Tailwind颜色类名，如 'blue', 'green', 'red'
  createdAt: number;
}

export interface TaggedFormula {
  latex: string;
  tags: string[]; // 标签ID数组
  timestamp: number;
}

// 预设标签颜色
export const TAG_COLORS = [
  { value: 'blue', label: '蓝色', class: 'bg-blue-500' },
  { value: 'green', label: '绿色', class: 'bg-green-500' },
  { value: 'red', label: '红色', class: 'bg-red-500' },
  { value: 'yellow', label: '黄色', class: 'bg-yellow-500' },
  { value: 'purple', label: '紫色', class: 'bg-purple-500' },
  { value: 'pink', label: '粉色', class: 'bg-pink-500' },
  { value: 'orange', label: '橙色', class: 'bg-orange-500' },
  { value: 'cyan', label: '青色', class: 'bg-cyan-500' },
  { value: 'indigo', label: '靛蓝', class: 'bg-indigo-500' },
  { value: 'gray', label: '灰色', class: 'bg-gray-500' },
];

// 预设标签
const DEFAULT_TAGS: LatexTag[] = [
  { id: 'exam-midterm', name: '期中考试', color: 'blue', createdAt: Date.now() },
  { id: 'exam-final', name: '期末考试', color: 'red', createdAt: Date.now() },
  { id: 'physics-mechanics', name: '力学专题', color: 'green', createdAt: Date.now() },
  { id: 'math-calculus', name: '微积分', color: 'purple', createdAt: Date.now() },
  { id: 'chemistry-organic', name: '有机化学', color: 'orange', createdAt: Date.now() },
];

const TAGS_STORAGE_KEY = 'latex_tags';
const TAGGED_FORMULAS_STORAGE_KEY = 'latex_tagged_formulas';

/**
 * 标签管理服务
 */
export class LatexTagManager {
  private tags: Map<string, LatexTag>;
  private taggedFormulas: Map<string, TaggedFormula>;

  constructor() {
    this.tags = new Map();
    this.taggedFormulas = new Map();
    this.loadTags();
    this.loadTaggedFormulas();
  }

  /**
   * 从localStorage加载标签
   */
  private loadTags() {
    try {
      const stored = localStorage.getItem(TAGS_STORAGE_KEY);
      if (stored) {
        const tags: LatexTag[] = JSON.parse(stored);
        tags.forEach((tag) => this.tags.set(tag.id, tag));
      } else {
        // 初始化默认标签
        DEFAULT_TAGS.forEach((tag) => this.tags.set(tag.id, tag));
        this.saveTags();
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
      DEFAULT_TAGS.forEach((tag) => this.tags.set(tag.id, tag));
    }
  }

  /**
   * 保存标签到localStorage
   */
  private saveTags() {
    try {
      const tags = Array.from(this.tags.values());
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
    } catch (error) {
      console.error('Failed to save tags:', error);
    }
  }

  /**
   * 从localStorage加载标记的公式
   */
  private loadTaggedFormulas() {
    try {
      const stored = localStorage.getItem(TAGGED_FORMULAS_STORAGE_KEY);
      if (stored) {
        const formulas: TaggedFormula[] = JSON.parse(stored);
        formulas.forEach((formula) => this.taggedFormulas.set(formula.latex, formula));
      }
    } catch (error) {
      console.error('Failed to load tagged formulas:', error);
    }
  }

  /**
   * 保存标记的公式到localStorage
   */
  private saveTaggedFormulas() {
    try {
      const formulas = Array.from(this.taggedFormulas.values());
      localStorage.setItem(TAGGED_FORMULAS_STORAGE_KEY, JSON.stringify(formulas));
    } catch (error) {
      console.error('Failed to save tagged formulas:', error);
    }
  }

  /**
   * 获取所有标签
   */
  getAllTags(): LatexTag[] {
    return Array.from(this.tags.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 根据ID获取标签
   */
  getTagById(id: string): LatexTag | undefined {
    return this.tags.get(id);
  }

  /**
   * 创建新标签
   */
  createTag(name: string, color: string): LatexTag {
    const id = `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tag: LatexTag = {
      id,
      name,
      color,
      createdAt: Date.now(),
    };
    this.tags.set(id, tag);
    this.saveTags();
    return tag;
  }

  /**
   * 更新标签
   */
  updateTag(id: string, name: string, color: string): boolean {
    const tag = this.tags.get(id);
    if (!tag) return false;

    tag.name = name;
    tag.color = color;
    this.saveTags();
    return true;
  }

  /**
   * 删除标签
   */
  deleteTag(id: string): boolean {
    if (!this.tags.has(id)) return false;

    this.tags.delete(id);
    this.saveTags();

    // 从所有公式中移除该标签
    this.taggedFormulas.forEach((formula) => {
      formula.tags = formula.tags.filter((tagId) => tagId !== id);
    });
    this.saveTaggedFormulas();

    return true;
  }

  /**
   * 为公式添加标签
   */
  addTagToFormula(latex: string, tagId: string): boolean {
    if (!this.tags.has(tagId)) return false;

    let formula = this.taggedFormulas.get(latex);
    if (!formula) {
      formula = {
        latex,
        tags: [],
        timestamp: Date.now(),
      };
      this.taggedFormulas.set(latex, formula);
    }

    if (!formula.tags.includes(tagId)) {
      formula.tags.push(tagId);
      this.saveTaggedFormulas();
    }

    return true;
  }

  /**
   * 从公式移除标签
   */
  removeTagFromFormula(latex: string, tagId: string): boolean {
    const formula = this.taggedFormulas.get(latex);
    if (!formula) return false;

    formula.tags = formula.tags.filter((id) => id !== tagId);
    if (formula.tags.length === 0) {
      this.taggedFormulas.delete(latex);
    }
    this.saveTaggedFormulas();
    return true;
  }

  /**
   * 获取公式的标签
   */
  getFormulaTags(latex: string): LatexTag[] {
    const formula = this.taggedFormulas.get(latex);
    if (!formula) return [];

    return formula.tags
      .map((tagId) => this.tags.get(tagId))
      .filter((tag): tag is LatexTag => tag !== undefined);
  }

  /**
   * 按标签筛选公式
   * @param tagIds 标签ID数组
   * @param mode 'AND' 或 'OR' 模式
   */
  filterFormulasByTags(tagIds: string[], mode: 'AND' | 'OR' = 'OR'): string[] {
    if (tagIds.length === 0) {
      return Array.from(this.taggedFormulas.keys());
    }

    const results: string[] = [];

    this.taggedFormulas.forEach((formula, latex) => {
      if (mode === 'AND') {
        // AND模式：公式必须包含所有指定标签
        const hasAllTags = tagIds.every((tagId) => formula.tags.includes(tagId));
        if (hasAllTags) {
          results.push(latex);
        }
      } else {
        // OR模式：公式包含任意一个指定标签
        const hasAnyTag = tagIds.some((tagId) => formula.tags.includes(tagId));
        if (hasAnyTag) {
          results.push(latex);
        }
      }
    });

    return results;
  }

  /**
   * 获取标签的使用统计
   */
  getTagStats(): Map<string, number> {
    const stats = new Map<string, number>();

    this.tags.forEach((tag) => {
      stats.set(tag.id, 0);
    });

    this.taggedFormulas.forEach((formula) => {
      formula.tags.forEach((tagId) => {
        stats.set(tagId, (stats.get(tagId) || 0) + 1);
      });
    });

    return stats;
  }

  /**
   * 搜索标签
   */
  searchTags(query: string): LatexTag[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTags().filter((tag) =>
      tag.name.toLowerCase().includes(lowerQuery)
    );
  }
}

// 导出单例实例
export const latexTagManager = new LatexTagManager();
