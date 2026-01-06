import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
  description: string;
  category?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // 忽略在输入框中的快捷键
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // 只允许Esc键在输入框中工作
        if (event.key !== 'Escape') {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          event.preventDefault();
          shortcut.handler(event);
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

// 全局快捷键配置
export const globalShortcuts: KeyboardShortcut[] = [
  {
    key: '/',
    ctrl: true,
    description: '显示快捷键帮助',
    category: '通用',
    handler: () => {
      // 将在组件中实现
    },
  },
  {
    key: 'k',
    ctrl: true,
    description: '打开菜单搜索',
    category: '导航',
    handler: () => {
      // 将在组件中实现
    },
  },
  {
    key: 'Escape',
    description: '关闭弹窗/对话框',
    category: '通用',
    handler: () => {
      // 将在组件中实现
    },
  },
];
