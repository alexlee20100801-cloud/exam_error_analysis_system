import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface AiFavoriteButtonProps {
  questionId: number;
  initialFavorited?: boolean;
  onToggle?: (isFavorited: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  showText?: boolean;
}

export function AiFavoriteButton({
  questionId,
  initialFavorited = false,
  onToggle,
  size = 'md',
  variant = 'ghost',
  showText = false,
}: AiFavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const utils = trpc.useUtils();

  const addFavorite = trpc.aiFavorites.add.useMutation({
    onSuccess: () => {
      setIsFavorited(true);
      toast.success('已添加到收藏');
      utils.aiFavorites.list.invalidate();
      utils.aiFavorites.stats.invalidate();
      onToggle?.(true);
    },
    onError: (error) => {
      toast.error(error.message || '收藏失败');
    },
  });

  const removeFavorite = trpc.aiFavorites.remove.useMutation({
    onSuccess: () => {
      setIsFavorited(false);
      toast.success('已取消收藏');
      utils.aiFavorites.list.invalidate();
      utils.aiFavorites.stats.invalidate();
      onToggle?.(false);
    },
    onError: (error) => {
      toast.error(error.message || '取消收藏失败');
    },
  });

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isFavorited) {
      removeFavorite.mutate({ questionId });
    } else {
      addFavorite.mutate({ questionId });
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  const isLoading = addFavorite.isPending || removeFavorite.isPending;

  return (
    <Button
      variant={variant}
      size={showText ? 'default' : 'icon'}
      className={showText ? 'gap-2' : sizeClasses[size]}
      onClick={handleToggle}
      disabled={isLoading}
      title={isFavorited ? '取消收藏' : '添加收藏'}
    >
      <Star
        size={iconSizes[size]}
        className={isFavorited ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}
      />
      {showText && <span>{isLoading ? '处理中...' : isFavorited ? '已收藏' : '收藏'}</span>}
    </Button>
  );
}
