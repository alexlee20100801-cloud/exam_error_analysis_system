import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Target, TrendingUp } from 'lucide-react';

const SUBJECTS = [
  { value: 'chinese', label: '语文' },
  { value: 'math', label: '数学' },
  { value: 'english', label: '英语' },
  { value: 'physics', label: '物理' },
  { value: 'chemistry', label: '化学' },
  { value: 'biology', label: '生物' },
  { value: 'politics', label: '政治' },
  { value: 'history', label: '历史' },
  { value: 'geography', label: '地理' }
];

const GRADES = [
  { value: 'junior1', label: '初一' },
  { value: 'junior2', label: '初二' },
  { value: 'junior3', label: '初三' },
  { value: 'senior1', label: '高一' },
  { value: 'senior2', label: '高二' },
  { value: 'senior3', label: '高三' }
];

const DIFFICULTIES = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' }
];

export default function RecommendationEngine() {
  const [subject, setSubject] = useState<string>('math');
  const [grade, setGrade] = useState<string>('junior1');
  const [difficulty, setDifficulty] = useState<string>('');
  const [minQualityScore, setMinQualityScore] = useState<number>(70);
  const [limit, setLimit] = useState<number>(10);

  // 基于质量评分的推荐
  const qualityRecommendation = trpc.recommendation.recommendByQuality.useQuery({
    subject: subject as any,
    grade: grade as any,
    minQualityScore,
    limit
  });

  // 个性化推荐
  const personalizedRecommendation = trpc.recommendation.recommendPersonalized.useQuery({
    subject: subject as any,
    grade: grade as any,
    difficulty: difficulty as any || undefined,
    minQualityScore,
    limit
  });

  // 知识点树
  const knowledgeTree = trpc.recommendation.getKnowledgeTree.useQuery({
    subject: subject as any,
    grade: grade as any
  });

  const handleRefresh = () => {
    qualityRecommendation.refetch();
    personalizedRecommendation.refetch();
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">智能推荐引擎</h1>
        <p className="text-muted-foreground">
          基于质量评分和知识图谱的个性化试题推荐系统
        </p>
      </div>

      {/* 推荐配置 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>推荐配置</CardTitle>
          <CardDescription>设置推荐参数以获取精准的试题推荐</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>学科</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>年级</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>难度</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {DIFFICULTIES.map(d => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>最低质量分数</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={minQualityScore}
                onChange={(e) => setMinQualityScore(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>推荐数量</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleRefresh} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                刷新推荐
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 推荐结果 */}
      <Tabs defaultValue="quality" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quality">
            <Target className="w-4 h-4 mr-2" />
            高质量推荐
          </TabsTrigger>
          <TabsTrigger value="personalized">
            <TrendingUp className="w-4 h-4 mr-2" />
            个性化推荐
          </TabsTrigger>
        </TabsList>

        {/* 高质量推荐 */}
        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>高质量试题推荐</CardTitle>
              <CardDescription>
                基于质量评分系统筛选的优质试题
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qualityRecommendation.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : qualityRecommendation.data && qualityRecommendation.data.length > 0 ? (
                <div className="space-y-4">
                  {qualityRecommendation.data.map((question: any, index: number) => (
                    <Card key={question.id} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <Badge>{question.subject}</Badge>
                            {question.difficulty && (
                              <Badge variant="secondary">{question.difficulty}</Badge>
                            )}
                          </div>
                          <Badge className="bg-green-500">
                            质量分: {question.qualityScore?.toFixed(1)}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="font-medium">题干:</p>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {question.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {question.recommendReason}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  暂无推荐结果,请调整筛选条件
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 个性化推荐 */}
        <TabsContent value="personalized">
          <Card>
            <CardHeader>
              <CardTitle>个性化推荐</CardTitle>
              <CardDescription>
                综合质量评分和知识图谱的智能推荐
              </CardDescription>
            </CardHeader>
            <CardContent>
              {personalizedRecommendation.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : personalizedRecommendation.data && personalizedRecommendation.data.length > 0 ? (
                <div className="space-y-4">
                  {personalizedRecommendation.data.map((question: any, index: number) => (
                    <Card key={question.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <Badge>{question.subject}</Badge>
                            {question.difficulty && (
                              <Badge variant="secondary">{question.difficulty}</Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Badge className="bg-blue-500">
                              推荐分: {question.recommendScore?.toFixed(1)}
                            </Badge>
                            <Badge variant="outline">
                              质量: {question.qualityScore?.toFixed(1)}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="font-medium">题干:</p>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {question.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {question.recommendReason}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  暂无推荐结果,请调整筛选条件
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 知识图谱预览 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>知识图谱</CardTitle>
          <CardDescription>
            当前学科的知识点结构
          </CardDescription>
        </CardHeader>
        <CardContent>
          {knowledgeTree.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : knowledgeTree.data && knowledgeTree.data.length > 0 ? (
            <div className="space-y-4">
              {knowledgeTree.data.map((chapter: any) => (
                <div key={chapter.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{chapter.name}</h3>
                  <div className="ml-4 space-y-2">
                    {chapter.children?.map((section: any) => (
                      <div key={section.id} className="border-l-2 pl-3">
                        <p className="font-medium text-sm">{section.name}</p>
                        <div className="ml-3 mt-1 flex flex-wrap gap-1">
                          {section.children?.map((point: any) => (
                            <Badge key={point.id} variant="secondary" className="text-xs">
                              {point.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              暂无知识图谱数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
