import { useEffect, useRef, useState } from "react";

export type SwipeDirection = "left" | "right" | "up" | "down" | null;

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minSwipeDistance?: number; // 最小滑动距离（px）
  maxSwipeTime?: number; // 最大滑动时间（ms）
  preventDefaultTouchMove?: boolean; // 是否阻止默认触摸滚动
}

interface SwipeState {
  isSwiping: boolean;
  direction: SwipeDirection;
  distance: number; // 当前滑动距离
  progress: number; // 滑动进度 (0-1)
}

export function useSwipeGesture<T extends HTMLElement>(
  options: SwipeGestureOptions = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance = 50,
    maxSwipeTime = 300,
    preventDefaultTouchMove = false,
  } = options;

  const elementRef = useRef<T>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  
  const [swipeState, setSwipeState] = useState<SwipeState>({
    isSwiping: false,
    direction: null,
    distance: 0,
    progress: 0,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      setSwipeState({
        isSwiping: false,
        direction: null,
        distance: 0,
        progress: 0,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      
      // 判断主要滑动方向
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      let direction: SwipeDirection = null;
      let distance = 0;
      
      if (absDeltaX > absDeltaY) {
        // 水平滑动
        direction = deltaX > 0 ? "right" : "left";
        distance = absDeltaX;
        
        // 如果是水平滑动且设置了阻止默认行为，则阻止垂直滚动
        if (preventDefaultTouchMove && absDeltaX > 10) {
          e.preventDefault();
        }
      } else {
        // 垂直滑动
        direction = deltaY > 0 ? "down" : "up";
        distance = absDeltaY;
      }
      
      const progress = Math.min(distance / minSwipeDistance, 1);
      
      setSwipeState({
        isSwiping: distance > 10,
        direction,
        distance,
        progress,
      });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // 判断是否为有效滑动
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (deltaTime <= maxSwipeTime) {
        if (absDeltaX > absDeltaY && absDeltaX >= minSwipeDistance) {
          // 水平滑动
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        } else if (absDeltaY >= minSwipeDistance) {
          // 垂直滑动
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }

      touchStartRef.current = null;
      setSwipeState({
        isSwiping: false,
        direction: null,
        distance: 0,
        progress: 0,
      });
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: !preventDefaultTouchMove });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });
    element.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance,
    maxSwipeTime,
    preventDefaultTouchMove,
  ]);

  return { ref: elementRef, swipeState };
}
