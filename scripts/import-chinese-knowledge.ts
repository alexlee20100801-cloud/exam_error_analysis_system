import { db } from '../server/db';
import { knowledgePoints } from '../drizzle/schema';

// 深圳初高中语文知识点数据（基于人教版统编教材）
// 采用三级结构: chapter -> section -> point
const chineseKnowledgeData = [
  // ==================== 初中语文 ====================
  
  // 七年级上册 - 章节级别
  { name: '第一单元', subject: 'chinese' as const, grade: 'junior1' as const, level: 'chapter' as const, parentId: null, description: '七年级上册第一单元', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '阅读', subject: 'chinese' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 1, description: '第一单元阅读部分', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '朗读与默读', subject: 'chinese' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 2, description: '学习正确的朗读方法,培养默读习惯,提高阅读速度', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '写作', subject: 'chinese' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 1, description: '第一单元写作部分', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '热爱生活,热爱写作', subject: 'chinese' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 4, description: '从生活中寻找写作素材,培养观察和表达能力', difficulty: 'easy' as const, semester: 'first' as const },
  
  { name: '第二单元', subject: 'chinese' as const, grade: 'junior1' as const, level: 'chapter' as const, parentId: null, description: '七年级上册第二单元', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '阅读', subject: 'chinese' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 6, description: '第二单元阅读部分', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '整体感知', subject: 'chinese' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 7, description: '把握文章主要内容,理解作者情感态度', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '写作', subject: 'chinese' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 6, description: '第二单元写作部分', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '学会记事', subject: 'chinese' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 9, description: '掌握记叙文的基本要素和写作方法', difficulty: 'easy' as const, semester: 'first' as const },
  
  { name: '第三单元', subject: 'chinese' as const, grade: 'junior1' as const, level: 'chapter' as const, parentId: null, description: '七年级上册第三单元', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '阅读', subject: 'chinese' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 11, description: '第三单元阅读部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '精读', subject: 'chinese' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 12, description: '学习精读方法,深入理解文章内涵', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '写作', subject: 'chinese' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 11, description: '第三单元写作部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '写人要抓住特点', subject: 'chinese' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 14, description: '通过外貌、语言、动作、心理描写刻画人物', difficulty: 'medium' as const, semester: 'first' as const },
  
  // 八年级上册
  { name: '第一单元', subject: 'chinese' as const, grade: 'junior2' as const, level: 'chapter' as const, parentId: null, description: '八年级上册第一单元', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '阅读', subject: 'chinese' as const, grade: 'junior2' as const, level: 'section' as const, parentId: 16, description: '第一单元阅读部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '新闻阅读', subject: 'chinese' as const, grade: 'junior2' as const, level: 'point' as const, parentId: 17, description: '学习新闻的特点和阅读方法', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '写作', subject: 'chinese' as const, grade: 'junior2' as const, level: 'section' as const, parentId: 16, description: '第一单元写作部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '新闻写作', subject: 'chinese' as const, grade: 'junior2' as const, level: 'point' as const, parentId: 19, description: '学习新闻的基本写作方法', difficulty: 'medium' as const, semester: 'first' as const },
  
  // 九年级上册
  { name: '第一单元', subject: 'chinese' as const, grade: 'junior3' as const, level: 'chapter' as const, parentId: null, description: '九年级上册第一单元', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '阅读', subject: 'chinese' as const, grade: 'junior3' as const, level: 'section' as const, parentId: 21, description: '第一单元阅读部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '诗歌鉴赏', subject: 'chinese' as const, grade: 'junior3' as const, level: 'point' as const, parentId: 22, description: '学习现代诗歌的鉴赏方法', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '写作', subject: 'chinese' as const, grade: 'junior3' as const, level: 'section' as const, parentId: 21, description: '第一单元写作部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '尝试创作诗歌', subject: 'chinese' as const, grade: 'junior3' as const, level: 'point' as const, parentId: 24, description: '学习诗歌的创作方法', difficulty: 'hard' as const, semester: 'first' as const },
  
  { name: '第二单元', subject: 'chinese' as const, grade: 'junior3' as const, level: 'chapter' as const, parentId: null, description: '九年级上册第二单元', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '阅读', subject: 'chinese' as const, grade: 'junior3' as const, level: 'section' as const, parentId: 26, description: '第二单元阅读部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '议论文阅读', subject: 'chinese' as const, grade: 'junior3' as const, level: 'point' as const, parentId: 27, description: '学习议论文的论点、论据、论证', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '写作', subject: 'chinese' as const, grade: 'junior3' as const, level: 'section' as const, parentId: 26, description: '第二单元写作部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '观点要明确', subject: 'chinese' as const, grade: 'junior3' as const, level: 'point' as const, parentId: 29, description: '学习在议论文中明确提出观点', difficulty: 'hard' as const, semester: 'first' as const },
  
  // ==================== 高中语文 ====================
  
  // 高一上册
  { name: '第一单元', subject: 'chinese' as const, grade: 'senior1' as const, level: 'chapter' as const, parentId: null, description: '高一上册第一单元', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '阅读', subject: 'chinese' as const, grade: 'senior1' as const, level: 'section' as const, parentId: 31, description: '第一单元阅读部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '诗歌鉴赏（现代诗）', subject: 'chinese' as const, grade: 'senior1' as const, level: 'point' as const, parentId: 32, description: '学习现代诗歌的意象、意境、情感', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '写作', subject: 'chinese' as const, grade: 'senior1' as const, level: 'section' as const, parentId: 31, description: '第一单元写作部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '学会记录', subject: 'chinese' as const, grade: 'senior1' as const, level: 'point' as const, parentId: 34, description: '学习记录生活和思考', difficulty: 'medium' as const, semester: 'first' as const },
  
  { name: '第二单元', subject: 'chinese' as const, grade: 'senior1' as const, level: 'chapter' as const, parentId: null, description: '高一上册第二单元', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '阅读', subject: 'chinese' as const, grade: 'senior1' as const, level: 'section' as const, parentId: 36, description: '第二单元阅读部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '散文阅读', subject: 'chinese' as const, grade: 'senior1' as const, level: 'point' as const, parentId: 37, description: '学习散文的语言、结构、主题', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '写作', subject: 'chinese' as const, grade: 'senior1' as const, level: 'section' as const, parentId: 36, description: '第二单元写作部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '学会审题立意', subject: 'chinese' as const, grade: 'senior1' as const, level: 'point' as const, parentId: 39, description: '学习准确审题和深刻立意', difficulty: 'hard' as const, semester: 'first' as const },
  
  // 高二上册
  { name: '第一单元', subject: 'chinese' as const, grade: 'senior2' as const, level: 'chapter' as const, parentId: null, description: '高二上册第一单元', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '阅读', subject: 'chinese' as const, grade: 'senior2' as const, level: 'section' as const, parentId: 41, description: '第一单元阅读部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '现代诗歌鉴赏', subject: 'chinese' as const, grade: 'senior2' as const, level: 'point' as const, parentId: 42, description: '深入学习现代诗歌的艺术手法', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '写作', subject: 'chinese' as const, grade: 'senior2' as const, level: 'section' as const, parentId: 41, description: '第一单元写作部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '学会议论', subject: 'chinese' as const, grade: 'senior2' as const, level: 'point' as const, parentId: 44, description: '提高议论文写作水平', difficulty: 'hard' as const, semester: 'first' as const },
  
  // 高三上册
  { name: '专题复习', subject: 'chinese' as const, grade: 'senior3' as const, level: 'chapter' as const, parentId: null, description: '高三上册专题复习', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '阅读', subject: 'chinese' as const, grade: 'senior3' as const, level: 'section' as const, parentId: 46, description: '专题复习阅读部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '现代文阅读综合', subject: 'chinese' as const, grade: 'senior3' as const, level: 'point' as const, parentId: 47, description: '综合复习现代文阅读技巧', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '古诗文阅读综合', subject: 'chinese' as const, grade: 'senior3' as const, level: 'point' as const, parentId: 47, description: '综合复习古诗文阅读技巧', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '写作', subject: 'chinese' as const, grade: 'senior3' as const, level: 'section' as const, parentId: 46, description: '专题复习写作部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '作文审题立意', subject: 'chinese' as const, grade: 'senior3' as const, level: 'point' as const, parentId: 50, description: '强化作文审题立意训练', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '作文结构布局', subject: 'chinese' as const, grade: 'senior3' as const, level: 'point' as const, parentId: 50, description: '强化作文结构布局训练', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '作文语言表达', subject: 'chinese' as const, grade: 'senior3' as const, level: 'point' as const, parentId: 50, description: '强化作文语言表达训练', difficulty: 'hard' as const, semester: 'first' as const },
];

async function importChineseKnowledge() {
  console.log('开始导入语文学科知识点数据...');
  console.log(`共${chineseKnowledgeData.length}条数据待导入\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const kp of chineseKnowledgeData) {
    try {
      await db.insert(knowledgePoints).values(kp);
      successCount++;
      console.log(`✓ [${successCount}/${chineseKnowledgeData.length}] 已导入: ${kp.name} (${kp.level})`);
    } catch (error: any) {
      errorCount++;
      console.error(`✗ 导入失败: ${kp.name}`, error.message);
    }
  }
  
  console.log(`\n导入完成！成功: ${successCount}, 失败: ${errorCount}`);
  process.exit(errorCount > 0 ? 1 : 0);
}

importChineseKnowledge().catch((error) => {
  console.error('导入过程出错:', error);
  process.exit(1);
});
