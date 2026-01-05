import axios from "axios";
import { invokeLLM } from "./_core/llm";

/**
 * 视频搜索服务 - 集成B站和YouTube
 */

export interface VideoSearchResult {
  platform: "bilibili" | "youtube";
  videoId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  author: string;
  viewCount: number;
  relevanceScore: number;
}

/**
 * 搜索B站视频
 */
async function searchBilibiliVideos(keyword: string, limit = 10): Promise<VideoSearchResult[]> {
  try {
    // 使用B站的公开搜索API
    const response = await axios.get("https://api.bilibili.com/x/web-interface/search/type", {
      params: {
        search_type: "video",
        keyword: keyword,
        page: 1,
        page_size: limit,
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (response.data.code !== 0 || !response.data.data?.result) {
      return [];
    }

    const results: VideoSearchResult[] = response.data.data.result.map((video: any) => ({
      platform: "bilibili" as const,
      videoId: video.bvid || video.aid?.toString() || "",
      title: video.title.replace(/<[^>]*>/g, ""), // 移除HTML标签
      description: video.description || "",
      videoUrl: `https://www.bilibili.com/video/${video.bvid || "av" + video.aid}`,
      thumbnailUrl: video.pic.startsWith("//") ? "https:" + video.pic : video.pic,
      duration: video.duration || 0,
      author: video.author || "",
      viewCount: video.play || 0,
      relevanceScore: 0, // 稍后通过AI评估
    }));

    return results;
  } catch (error) {
    console.error("[Video Search] B站搜索失败:", error);
    return [];
  }
}

/**
 * 搜索YouTube视频
 */
async function searchYouTubeVideos(keyword: string, limit = 10): Promise<VideoSearchResult[]> {
  try {
    // 由于YouTube API需要密钥，这里使用通用搜索方式
    // 实际部署时可以让用户提供YouTube API密钥
    
    // 暂时返回空数组，后续可以集成YouTube Data API
    // 或使用第三方YouTube搜索服务
    console.log("[Video Search] YouTube搜索功能待集成API密钥");
    return [];
  } catch (error) {
    console.error("[Video Search] YouTube搜索失败:", error);
    return [];
  }
}

/**
 * 使用AI评估视频与知识点的相关性
 */
async function evaluateVideoRelevance(
  video: VideoSearchResult,
  knowledgePoints: string[],
  subject: string,
  grade: string
): Promise<number> {
  try {
    const systemPrompt = `你是一个教育视频评估专家。请评估视频与学生学习需求的相关性。`;

    const userPrompt = `请评估以下视频与学习需求的相关性：

视频标题：${video.title}
视频描述：${video.description}

学习需求：
- 学科：${subject}
- 年级：${grade}
- 知识点：${knowledgePoints.join("、")}

请给出相关性评分（0-100分），分数越高表示越相关。只返回数字。`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "video_relevance_score",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: {
                type: "number",
                description: "相关性评分，0-100之间的数字"
              }
            },
            required: ["score"],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0]?.message?.content;
    const resultText = typeof messageContent === 'string' ? messageContent : "";

    if (!resultText) {
      return 50; // 默认中等相关性
    }

    const scoreData = JSON.parse(resultText);
    return Math.max(0, Math.min(100, scoreData.score || 50));
  } catch (error) {
    console.error("[Video Relevance] 评估失败:", error);
    return 50; // 默认中等相关性
  }
}

/**
 * 搜索学习视频（综合B站和YouTube）
 */
export async function searchLearningVideos(
  knowledgePoints: string[],
  subject: string,
  grade: string,
  limit = 10
): Promise<VideoSearchResult[]> {
  try {
    // 构建搜索关键词
    const subjectMap: Record<string, string> = {
      chinese: "语文",
      math: "数学",
      english: "英语",
      physics: "物理",
      chemistry: "化学",
      biology: "生物",
      politics: "政治",
      history: "历史",
      geography: "地理",
    };

    const gradeMap: Record<string, string> = {
      junior1: "初一",
      junior2: "初二",
      junior3: "初三",
      senior1: "高一",
      senior2: "高二",
      senior3: "高三",
    };

    const subjectText = subjectMap[subject] || subject;
    const gradeText = gradeMap[grade] || grade;
    
    // 组合关键词
    const keywords = knowledgePoints.length > 0 
      ? `${gradeText} ${subjectText} ${knowledgePoints[0]} 讲解`
      : `${gradeText} ${subjectText} 知识点讲解`;

    // 搜索B站视频
    const bilibiliResults = await searchBilibiliVideos(keywords, limit);

    // 搜索YouTube视频（如果需要）
    // const youtubeResults = await searchYouTubeVideos(keywords, limit);

    // 合并结果
    let allResults = [...bilibiliResults];

    // 使用AI评估相关性
    for (const video of allResults) {
      video.relevanceScore = await evaluateVideoRelevance(
        video,
        knowledgePoints,
        subject,
        grade
      );
    }

    // 按相关性排序
    allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // 返回前N个结果
    return allResults.slice(0, limit);
  } catch (error) {
    console.error("[Video Search] 搜索失败:", error);
    return [];
  }
}

/**
 * 根据错题搜索相关视频
 */
export async function searchVideosForErrorQuestion(
  questionContent: string,
  knowledgePoints: string[],
  subject: string,
  grade: string,
  limit = 5
): Promise<VideoSearchResult[]> {
  return await searchLearningVideos(knowledgePoints, subject, grade, limit);
}
