/**
 * LaTeX公式历史记录管理
 * 使用localStorage保存用户最近使用的公式
 */

const STORAGE_KEY = 'latex_formula_history';
const MAX_HISTORY_SIZE = 20;

export interface LatexHistoryItem {
  latex: string;
  timestamp: number;
  usageCount: number;
}

/**
 * 获取历史记录
 */
export const getLatexHistory = (): LatexHistoryItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const history = JSON.parse(stored) as LatexHistoryItem[];
    // 按使用次数和时间排序
    return history.sort((a, b) => {
      // 优先按使用次数排序
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      // 使用次数相同，按时间排序
      return b.timestamp - a.timestamp;
    });
  } catch (error) {
    console.error('Failed to load LaTeX history:', error);
    return [];
  }
};

/**
 * 添加到历史记录
 */
export const addToLatexHistory = (latex: string): void => {
  if (!latex.trim()) {
    return;
  }

  try {
    const history = getLatexHistory();
    
    // 查找是否已存在
    const existingIndex = history.findIndex(item => item.latex === latex);
    
    if (existingIndex >= 0) {
      // 已存在，更新使用次数和时间
      history[existingIndex].usageCount += 1;
      history[existingIndex].timestamp = Date.now();
    } else {
      // 不存在，添加新记录
      history.unshift({
        latex,
        timestamp: Date.now(),
        usageCount: 1,
      });
    }

    // 限制历史记录数量
    const trimmedHistory = history.slice(0, MAX_HISTORY_SIZE);

    // 保存到localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Failed to save LaTeX history:', error);
  }
};

/**
 * 清除历史记录
 */
export const clearLatexHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear LaTeX history:', error);
  }
};

/**
 * 删除单条历史记录
 */
export const removeFromLatexHistory = (latex: string): void => {
  try {
    const history = getLatexHistory();
    const filtered = history.filter(item => item.latex !== latex);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove from LaTeX history:', error);
  }
};

/**
 * 格式化时间显示
 */
export const formatHistoryTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}分钟前`;
  } else if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}小时前`;
  } else if (diff < 7 * day) {
    const days = Math.floor(diff / day);
    return `${days}天前`;
  } else {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  }
};
