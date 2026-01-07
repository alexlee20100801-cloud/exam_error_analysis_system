import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';

export default function KnowledgeGraph() {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('math');
  const [selectedGrade, setSelectedGrade] = useState<string>('junior1');
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // 获取知识点数据
  const { data: knowledgePoints, isLoading } = trpc.knowledgePoints.list.useQuery({
    subject: selectedSubject as any,
    grade: selectedGrade as any,
  });

  // 获取知识点关系
  const { data: relations } = trpc.knowledgePoints.getRelations.useQuery({
    subject: selectedSubject as any,
    grade: selectedGrade as any,
  });

  // 初始化图谱
  useEffect(() => {
    if (!containerRef.current || !knowledgePoints || !relations) return;

    // 准备节点数据
    const nodes = knowledgePoints.map((kp: any) => ({
      data: {
        id: `kp-${kp.id}`,
        label: kp.name,
        level: kp.level,
        difficulty: kp.difficulty,
        description: kp.description,
      },
    }));

    // 准备边数据
    const edges = relations.map((rel: any) => ({
      data: {
        id: `edge-${rel.id}`,
        source: `kp-${rel.fromKnowledgePointId}`,
        target: `kp-${rel.toKnowledgePointId}`,
        relationType: rel.relationType,
        strength: rel.strength,
      },
    }));

    // 创建Cytoscape实例
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => {
              const level = ele.data('level');
              if (level === 'chapter') return '#3b82f6';
              if (level === 'section') return '#10b981';
              return '#f59e0b';
            },
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#fff',
            'font-size': '12px',
            'width': (ele: any) => {
              const level = ele.data('level');
              if (level === 'chapter') return 60;
              if (level === 'section') return 50;
              return 40;
            },
            'height': (ele: any) => {
              const level = ele.data('level');
              if (level === 'chapter') return 60;
              if (level === 'section') return 50;
              return 40;
            },
            'border-width': 2,
            'border-color': '#fff',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': (ele: any) => {
              const type = ele.data('relationType');
              if (type === 'prerequisite') return '#ef4444';
              if (type === 'related') return '#8b5cf6';
              if (type === 'advanced') return '#06b6d4';
              return '#64748b';
            },
            'target-arrow-color': (ele: any) => {
              const type = ele.data('relationType');
              if (type === 'prerequisite') return '#ef4444';
              if (type === 'related') return '#8b5cf6';
              if (type === 'advanced') return '#06b6d4';
              return '#64748b';
            },
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.5,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#fbbf24',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      },
      minZoom: 0.3,
      maxZoom: 3,
    });

    // 节点点击事件
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNode({
        id: node.data('id'),
        label: node.data('label'),
        level: node.data('level'),
        difficulty: node.data('difficulty'),
        description: node.data('description'),
      });
    });

    // 背景点击事件
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [knowledgePoints, relations]);

  // 缩放控制
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
      cyRef.current.center();
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
      cyRef.current.center();
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit();
    }
  };

  const handleReset = () => {
    if (cyRef.current) {
      cyRef.current.layout({
        name: 'cose',
        animate: true,
        animationDuration: 500,
      } as any).run();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">知识图谱可视化</h1>
          
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chinese">语文</SelectItem>
              <SelectItem value="math">数学</SelectItem>
              <SelectItem value="english">英语</SelectItem>
              <SelectItem value="physics">物理</SelectItem>
              <SelectItem value="chemistry">化学</SelectItem>
              <SelectItem value="biology">生物</SelectItem>
              <SelectItem value="politics">政治</SelectItem>
              <SelectItem value="history">历史</SelectItem>
              <SelectItem value="geography">地理</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="junior1">初一</SelectItem>
              <SelectItem value="junior2">初二</SelectItem>
              <SelectItem value="junior3">初三</SelectItem>
              <SelectItem value="senior1">高一</SelectItem>
              <SelectItem value="senior2">高二</SelectItem>
              <SelectItem value="senior3">高三</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleFit}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 图谱容器 */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          <div ref={containerRef} className="w-full h-full" />
          
          {/* 图例 */}
          <Card className="absolute bottom-4 left-4 p-4 space-y-2">
            <div className="font-semibold text-sm mb-2">图例</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <span>章节</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span>小节</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span>知识点</span>
              </div>
            </div>
            <div className="border-t pt-2 mt-2 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-red-500" />
                <span>前置关系</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-purple-500" />
                <span>关联关系</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-cyan-500" />
                <span>进阶关系</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 右侧详情面板 */}
        {selectedNode && (
          <Card className="w-80 m-4 p-4 space-y-4 overflow-y-auto">
            <div>
              <h3 className="font-semibold text-lg mb-2">{selectedNode.label}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">层级:</span>
                  <span className="font-medium">
                    {selectedNode.level === 'chapter' && '章节'}
                    {selectedNode.level === 'section' && '小节'}
                    {selectedNode.level === 'point' && '知识点'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">难度:</span>
                  <span className="font-medium">
                    {selectedNode.difficulty === 'easy' && '简单'}
                    {selectedNode.difficulty === 'medium' && '中等'}
                    {selectedNode.difficulty === 'hard' && '困难'}
                  </span>
                </div>
              </div>
            </div>

            {selectedNode.description && (
              <div>
                <div className="text-sm font-semibold mb-2">描述</div>
                <p className="text-sm text-muted-foreground">{selectedNode.description}</p>
              </div>
            )}

            <div className="space-y-2">
              <Button className="w-full" size="sm">
                查看相关试题
              </Button>
              <Button className="w-full" variant="outline" size="sm">
                查看学习路径
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
