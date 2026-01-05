import { useEffect, useRef, useState } from "react";

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // 触发刷新的下拉距离（px）
  maxPullDistance?: number; // 最大下拉距离（px）
  disabled?: boolean;
}

interface PullState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  progress: number; // 0-1
}

export function usePullToRefresh<T extends HTMLElement>(
  options: PullToRefreshOptions
) {
  const {
    onRefresh,
    threshold = 80,
    maxPullDistance = 120,
    disabled = false,
  } = options;

  const elementRef = useRef<T>(null);
  const startYRef = useRef<number>(0);
  const [pullState, setPullState] = useState<PullState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    progress: 0,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // 只有在滚动到顶部时才允许下拉刷新
      if (element.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current === 0 || element.scrollTop > 0) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startYRef.current;

      if (deltaY > 0) {
        // 向下拉
        const pullDistance = Math.min(deltaY * 0.5, maxPullDistance); // 添加阻尼效果
        const progress = Math.min(pullDistance / threshold, 1);

        setPullState({
          isPulling: true,
          isRefreshing: false,
          pullDistance,
          progress,
        });

        // 阻止默认滚动
        if (pullDistance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullState.isPulling && pullState.pullDistance >= threshold) {
        // 触发刷新
        setPullState({
          isPulling: false,
          isRefreshing: true,
          pullDistance: threshold,
          progress: 1,
        });

        try {
          await onRefresh();
        } finally {
          setPullState({
            isPulling: false,
            isRefreshing: false,
            pullDistance: 0,
            progress: 0,
          });
        }
      } else {
        // 未达到阈值，重置状态
        setPullState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          progress: 0,
        });
      }

      startYRef.current = 0;
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });
    element.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [disabled, threshold, maxPullDistance, onRefresh, pullState.isPulling, pullState.pullDistance]);

  return { ref: elementRef, pullState };
}
