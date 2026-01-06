import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface FavoriteButtonProps {
  questionId: number;
  questionType: "error_question" | "practice_question" | "question";
  initialFavorited?: boolean;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export function FavoriteButton({
  questionId,
  questionType,
  initialFavorited = false,
  variant = "ghost",
  size = "sm",
  showText = true,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const utils = trpc.useUtils();

  // 添加收藏
  const addMutation = trpc.favorites.add.useMutation({
    onSuccess: () => {
      setIsFavorited(true);
      toast.success("收藏成功");
      // 刷新收藏列表
      utils.favorites.list.invalidate();
      utils.favorites.stats.invalidate();
    },
    onError: (error) => {
      toast.error(`收藏失败：${error.message}`);
    },
  });

  // 取消收藏
  const removeMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      setIsFavorited(false);
      toast.success("已取消收藏");
      // 刷新收藏列表
      utils.favorites.list.invalidate();
      utils.favorites.stats.invalidate();
    },
    onError: (error) => {
      toast.error(`取消收藏失败：${error.message}`);
    },
  });

  const handleToggle = () => {
    if (isFavorited) {
      removeMutation.mutate({
        questionId,
        questionType,
      });
    } else {
      addMutation.mutate({
        questionId,
        questionType,
      });
    }
  };

  const isLoading = addMutation.isPending || removeMutation.isPending;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className="gap-2"
    >
      <Heart
        className={`h-4 w-4 transition-colors ${
          isFavorited ? "fill-red-500 text-red-500" : ""
        }`}
      />
      {showText && (
        <span>{isLoading ? "处理中..." : isFavorited ? "已收藏" : "收藏"}</span>
      )}
    </Button>
  );
}
