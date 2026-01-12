import { useState, useRef, useEffect, useCallback, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff, RefreshCw } from 'lucide-react';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  src: string;
  alt: string;
  placeholder?: string;
  blurDataURL?: string;
  fallback?: React.ReactNode;
  aspectRatio?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  threshold?: number;
  rootMargin?: string;
  retryCount?: number;
  retryDelay?: number;
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
  showSkeleton?: boolean;
  skeletonClassName?: string;
}

// 低质量图片占位符生成器
function generatePlaceholder(width: number = 10, height: number = 10): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Crect fill='%23f0f0f0' width='${width}' height='${height}'/%3E%3C/svg%3E`;
}

// 图片加载状态
type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export function LazyImage({
  src,
  alt,
  placeholder,
  blurDataURL,
  fallback,
  aspectRatio,
  objectFit = 'cover',
  threshold = 0.1,
  rootMargin = '100px',
  retryCount = 3,
  retryDelay = 1000,
  onLoadComplete,
  onLoadError,
  showSkeleton = true,
  skeletonClassName,
  className,
  style,
  ...props
}: LazyImageProps) {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [currentSrc, setCurrentSrc] = useState<string>(placeholder || blurDataURL || generatePlaceholder());
  const [retries, setRetries] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用Intersection Observer检测图片是否进入视口
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  // 当图片进入视口时开始加载
  useEffect(() => {
    if (!isInView || !src) return;

    setLoadState('loading');

    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(src);
      setLoadState('loaded');
      onLoadComplete?.();
    };

    img.onerror = () => {
      if (retries < retryCount) {
        // 重试加载
        setTimeout(() => {
          setRetries((prev) => prev + 1);
        }, retryDelay * (retries + 1));
      } else {
        setLoadState('error');
        onLoadError?.(new Error(`Failed to load image: ${src}`));
      }
    };

    // 添加缓存破坏参数用于重试
    const loadSrc = retries > 0 ? `${src}${src.includes('?') ? '&' : '?'}retry=${retries}` : src;
    img.src = loadSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src, retries, retryCount, retryDelay, onLoadComplete, onLoadError]);

  // 手动重试
  const handleRetry = useCallback(() => {
    setRetries(0);
    setLoadState('idle');
    setIsInView(true);
  }, []);

  // 计算容器样式
  const containerStyle: React.CSSProperties = {
    ...style,
    position: 'relative',
    overflow: 'hidden',
    ...(aspectRatio && {
      aspectRatio: `${aspectRatio}`,
    }),
  };

  // 渲染错误状态
  if (loadState === 'error') {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          'flex flex-col items-center justify-center bg-muted text-muted-foreground',
          className
        )}
        style={containerStyle}
      >
        <ImageOff className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-xs mb-2">图片加载失败</span>
        <button
          onClick={handleRetry}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <RefreshCw className="h-3 w-3" />
          重试
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative', className)} style={containerStyle}>
      {/* 骨架屏/占位符 */}
      {showSkeleton && loadState !== 'loaded' && (
        <div
          className={cn(
            'absolute inset-0 bg-muted animate-pulse',
            skeletonClassName
          )}
        />
      )}

      {/* 模糊占位图 */}
      {blurDataURL && loadState !== 'loaded' && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full blur-lg scale-110"
          style={{ objectFit }}
          aria-hidden="true"
        />
      )}

      {/* 实际图片 */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          loadState === 'loaded' ? 'opacity-100' : 'opacity-0'
        )}
        style={{ objectFit }}
        loading="lazy"
        decoding="async"
        {...props}
      />

      {/* 加载指示器 */}
      {loadState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// 错题图片专用组件
interface ErrorQuestionImageProps extends Omit<LazyImageProps, 'aspectRatio'> {
  questionId?: string;
}

export function ErrorQuestionImage({
  src,
  alt,
  questionId,
  className,
  ...props
}: ErrorQuestionImageProps) {
  return (
    <LazyImage
      src={src}
      alt={alt || `错题图片 ${questionId || ''}`}
      className={cn('rounded-lg border bg-background', className)}
      objectFit="contain"
      threshold={0.1}
      rootMargin="200px"
      retryCount={3}
      showSkeleton={true}
      {...props}
    />
  );
}

// 图片画廊组件
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt?: string;
    id?: string;
  }>;
  columns?: number;
  gap?: number;
  aspectRatio?: number;
  onImageClick?: (index: number) => void;
  className?: string;
}

export function ImageGallery({
  images,
  columns = 3,
  gap = 4,
  aspectRatio = 1,
  onImageClick,
  className,
}: ImageGalleryProps) {
  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap * 4}px`,
      }}
    >
      {images.map((image, index) => (
        <button
          key={image.id || index}
          onClick={() => onImageClick?.(index)}
          className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg overflow-hidden"
        >
          <LazyImage
            src={image.src}
            alt={image.alt || `图片 ${index + 1}`}
            aspectRatio={aspectRatio}
            objectFit="cover"
            className="w-full cursor-pointer hover:scale-105 transition-transform"
          />
        </button>
      ))}
    </div>
  );
}

// 渐进式图片加载Hook
export function useProgressiveImage(src: string, placeholder?: string) {
  const [currentSrc, setCurrentSrc] = useState(placeholder || generatePlaceholder());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!src) return;

    setIsLoading(true);
    setError(null);

    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      setError(new Error(`Failed to load image: ${src}`));
      setIsLoading(false);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { src: currentSrc, isLoading, error };
}

export default LazyImage;
