import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, Target, Zap } from "lucide-react";

/**
 * AI题库生成预设模板
 */

export interface GenerationTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  config: {
    subjects: string[];
    grades: string[];
    totalQuestions: number;
    difficultiesDistribution: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
}

export const templates: GenerationTemplate[] = [
  {
    id: "quick-start",
    name: "快速开始",
    description: "适合首次使用，生成少量题目快速体验功能",
    icon: <Zap className="h-5 w-5" />,
    badge: "推荐",
    config: {
      subjects: ["math"],
      grades: ["senior1"],
      totalQuestions: 50,
      difficultiesDistribution: {
        easy: 40,
        medium: 40,
        hard: 20,
      },
    },
  },
  {
    id: "junior-complete",
    name: "初中全科",
    description: "覆盖初中三年全部学科，适合初中题库建设",
    icon: <BookOpen className="h-5 w-5" />,
    config: {
      subjects: ["math", "chinese", "english", "physics", "chemistry"],
      grades: ["junior1", "junior2", "junior3"],
      totalQuestions: 500,
      difficultiesDistribution: {
        easy: 30,
        medium: 50,
        hard: 20,
      },
    },
  },
  {
    id: "senior-complete",
    name: "高中全科",
    description: "覆盖高中三年全部学科，适合高中题库建设",
    icon: <GraduationCap className="h-5 w-5" />,
    config: {
      subjects: ["math", "chinese", "english", "physics", "chemistry", "biology", "politics", "history", "geography"],
      grades: ["senior1", "senior2", "senior3"],
      totalQuestions: 800,
      difficultiesDistribution: {
        easy: 25,
        medium: 50,
        hard: 25,
      },
    },
  },
  {
    id: "exam-focused",
    name: "考试重点",
    description: "侧重中高难度题目，适合备考冲刺阶段",
    icon: <Target className="h-5 w-5" />,
    config: {
      subjects: ["math", "physics", "chemistry"],
      grades: ["senior3"],
      totalQuestions: 300,
      difficultiesDistribution: {
        easy: 15,
        medium: 45,
        hard: 40,
      },
    },
  },
];

interface GenerationTemplatesProps {
  onSelectTemplate: (template: GenerationTemplate) => void;
}

export function GenerationTemplates({ onSelectTemplate }: GenerationTemplatesProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates.map((template) => (
        <Card key={template.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {template.icon}
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {template.name}
                    {template.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {template.badge}
                      </Badge>
                    )}
                  </CardTitle>
                </div>
              </div>
            </div>
            <CardDescription className="mt-2">
              {template.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">题目数量：</span>
                  <span className="font-medium">{template.config.totalQuestions}题</span>
                </div>
                <div>
                  <span className="text-muted-foreground">学科数：</span>
                  <span className="font-medium">{template.config.subjects.length}个</span>
                </div>
                <div>
                  <span className="text-muted-foreground">年级数：</span>
                  <span className="font-medium">{template.config.grades.length}个</span>
                </div>
                <div>
                  <span className="text-muted-foreground">难度分布：</span>
                  <span className="font-medium text-xs">
                    {template.config.difficultiesDistribution.easy}/
                    {template.config.difficultiesDistribution.medium}/
                    {template.config.difficultiesDistribution.hard}
                  </span>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => onSelectTemplate(template)}
              >
                使用此模板
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
