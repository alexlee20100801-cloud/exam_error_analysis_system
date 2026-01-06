import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft } from "lucide-react";

/**
 * 分步引导组件
 */

export interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface GuidedTourProps {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function GuidedTour({ steps, isActive, onComplete, onSkip }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const updateTargetPosition = () => {
      const step = steps[currentStep];
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        
        // 高亮目标元素
        element.classList.add("tour-highlight");
        
        // 滚动到目标元素
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
      
      // 移除所有高亮
      document.querySelectorAll(".tour-highlight").forEach((el) => {
        el.classList.remove("tour-highlight");
      });
    };
  }, [currentStep, isActive, steps]);

  if (!isActive || !targetRect) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // 计算提示卡片位置
  const getCardPosition = () => {
    const placement = step.placement || "bottom";
    const padding = 16;

    switch (placement) {
      case "top":
        return {
          left: targetRect.left + targetRect.width / 2,
          top: targetRect.top - padding,
          transform: "translate(-50%, -100%)",
        };
      case "bottom":
        return {
          left: targetRect.left + targetRect.width / 2,
          top: targetRect.bottom + padding,
          transform: "translate(-50%, 0)",
        };
      case "left":
        return {
          left: targetRect.left - padding,
          top: targetRect.top + targetRect.height / 2,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          left: targetRect.right + padding,
          top: targetRect.top + targetRect.height / 2,
          transform: "translate(0, -50%)",
        };
    }
  };

  const cardPosition = getCardPosition();

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      {/* 遮罩层 */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={onSkip} />

      {/* 高亮区域 */}
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          left: targetRect.left - 4,
          top: targetRect.top - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.5)",
          borderRadius: "8px",
        }}
      />

      {/* 引导卡片 */}
      <Card
        className="fixed z-[10000] w-[320px] shadow-xl"
        style={{
          left: cardPosition.left,
          top: cardPosition.top,
          transform: cardPosition.transform,
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                步骤 {currentStep + 1} / {steps.length}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={onSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {step.content}
          </p>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              上一步
            </Button>

            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    index === currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <Button size="sm" onClick={handleNext}>
              {isLastStep ? "完成" : "下一步"}
              {!isLastStep && <ArrowRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 添加高亮样式 */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 9999;
        }
      `}</style>
    </>
  );
}
