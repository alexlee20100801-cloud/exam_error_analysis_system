import { db } from '../server/db';
import { knowledgePoints } from '../drizzle/schema';

// 深圳初高中英语知识点数据（基于沪教牛津版/人教版）
// 采用三级结构: chapter -> section -> point
const englishKnowledgeData = [
  // ==================== 初中英语 ====================
  
  // 七年级上册
  { name: 'Unit 1', subject: 'english' as const, grade: 'junior1' as const, level: 'chapter' as const, parentId: null, description: '七年级上册Unit 1', difficulty: 'easy' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 1, description: 'Unit 1语法部分', difficulty: 'easy' as const, semester: 'first' as const },
  { name: 'be动词的用法', subject: 'english' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 2, description: '学习am, is, are的用法和区别', difficulty: 'easy' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 1, description: 'Unit 1词汇部分', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '问候与介绍', subject: 'english' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 4, description: '学习基本的问候语和自我介绍', difficulty: 'easy' as const, semester: 'first' as const },
  
  { name: 'Unit 2', subject: 'english' as const, grade: 'junior1' as const, level: 'chapter' as const, parentId: null, description: '七年级上册Unit 2', difficulty: 'easy' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 6, description: 'Unit 2语法部分', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '指示代词this/that', subject: 'english' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 7, description: '学习this, that, these, those的用法', difficulty: 'easy' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 6, description: 'Unit 2词汇部分', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '家庭成员', subject: 'english' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 9, description: '学习家庭成员的英文表达', difficulty: 'easy' as const, semester: 'first' as const },
  
  { name: 'Unit 3', subject: 'english' as const, grade: 'junior1' as const, level: 'chapter' as const, parentId: null, description: '七年级上册Unit 3', difficulty: 'easy' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 11, description: 'Unit 3语法部分', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '名词所有格', subject: 'english' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 12, description: '学习\'s和of表示所属关系', difficulty: 'easy' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'junior1' as const, level: 'section' as const, parentId: 11, description: 'Unit 3词汇部分', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '学校用品', subject: 'english' as const, grade: 'junior1' as const, level: 'point' as const, parentId: 14, description: '学习常见学校用品的英文表达', difficulty: 'easy' as const, semester: 'first' as const },
  
  // 八年级上册
  { name: 'Unit 1', subject: 'english' as const, grade: 'junior2' as const, level: 'chapter' as const, parentId: null, description: '八年级上册Unit 1', difficulty: 'medium' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'junior2' as const, level: 'section' as const, parentId: 16, description: 'Unit 1语法部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '一般过去时', subject: 'english' as const, grade: 'junior2' as const, level: 'point' as const, parentId: 17, description: '学习一般过去时的构成和用法', difficulty: 'medium' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'junior2' as const, level: 'section' as const, parentId: 16, description: 'Unit 1词汇部分', difficulty: 'easy' as const, semester: 'first' as const },
  { name: '假期活动', subject: 'english' as const, grade: 'junior2' as const, level: 'point' as const, parentId: 19, description: '学习描述假期活动的词汇', difficulty: 'easy' as const, semester: 'first' as const },
  
  { name: 'Unit 2', subject: 'english' as const, grade: 'junior2' as const, level: 'chapter' as const, parentId: null, description: '八年级上册Unit 2', difficulty: 'medium' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'junior2' as const, level: 'section' as const, parentId: 21, description: 'Unit 2语法部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '频率副词', subject: 'english' as const, grade: 'junior2' as const, level: 'point' as const, parentId: 22, description: '学习频率副词的用法和位置', difficulty: 'medium' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'junior2' as const, level: 'section' as const, parentId: 21, description: 'Unit 2词汇部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '健康习惯', subject: 'english' as const, grade: 'junior2' as const, level: 'point' as const, parentId: 24, description: '学习描述健康习惯的词汇', difficulty: 'medium' as const, semester: 'first' as const },
  
  { name: 'Unit 3', subject: 'english' as const, grade: 'junior2' as const, level: 'chapter' as const, parentId: null, description: '八年级上册Unit 3', difficulty: 'medium' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'junior2' as const, level: 'section' as const, parentId: 26, description: 'Unit 3语法部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '形容词比较级和最高级', subject: 'english' as const, grade: 'junior2' as const, level: 'point' as const, parentId: 27, description: '学习形容词的比较级和最高级形式', difficulty: 'medium' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'junior2' as const, level: 'section' as const, parentId: 26, description: 'Unit 3词汇部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '个人特征', subject: 'english' as const, grade: 'junior2' as const, level: 'point' as const, parentId: 29, description: '学习描述个人特征的词汇', difficulty: 'medium' as const, semester: 'first' as const },
  
  // 九年级上册
  { name: 'Unit 1', subject: 'english' as const, grade: 'junior3' as const, level: 'chapter' as const, parentId: null, description: '九年级上册Unit 1', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'junior3' as const, level: 'section' as const, parentId: 31, description: 'Unit 1语法部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '动名词作宾语', subject: 'english' as const, grade: 'junior3' as const, level: 'point' as const, parentId: 32, description: '学习动名词在句中作宾语的用法', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'junior3' as const, level: 'section' as const, parentId: 31, description: 'Unit 1词汇部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '学习方法', subject: 'english' as const, grade: 'junior3' as const, level: 'point' as const, parentId: 34, description: '学习描述学习方法的词汇', difficulty: 'medium' as const, semester: 'first' as const },
  
  { name: 'Unit 2', subject: 'english' as const, grade: 'junior3' as const, level: 'chapter' as const, parentId: null, description: '九年级上册Unit 2', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'junior3' as const, level: 'section' as const, parentId: 36, description: 'Unit 2语法部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '宾语从句', subject: 'english' as const, grade: 'junior3' as const, level: 'point' as const, parentId: 37, description: '学习宾语从句的引导词和语序', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'junior3' as const, level: 'section' as const, parentId: 36, description: 'Unit 2词汇部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '节日与庆祝', subject: 'english' as const, grade: 'junior3' as const, level: 'point' as const, parentId: 39, description: '学习节日和庆祝活动的英文表达', difficulty: 'medium' as const, semester: 'first' as const },
  
  { name: 'Unit 3', subject: 'english' as const, grade: 'junior3' as const, level: 'chapter' as const, parentId: null, description: '九年级上册Unit 3', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'junior3' as const, level: 'section' as const, parentId: 41, description: 'Unit 3语法部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '宾语从句的时态', subject: 'english' as const, grade: 'junior3' as const, level: 'point' as const, parentId: 42, description: '学习宾语从句中的时态呼应', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'junior3' as const, level: 'section' as const, parentId: 41, description: 'Unit 3词汇部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '问路与指路', subject: 'english' as const, grade: 'junior3' as const, level: 'point' as const, parentId: 44, description: '学习问路和指路的英文表达', difficulty: 'medium' as const, semester: 'first' as const },
  
  // ==================== 高中英语 ====================
  
  // 高一上册
  { name: 'Unit 1', subject: 'english' as const, grade: 'senior1' as const, level: 'chapter' as const, parentId: null, description: '高一上册Unit 1', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'senior1' as const, level: 'section' as const, parentId: 46, description: 'Unit 1语法部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '现在完成进行时', subject: 'english' as const, grade: 'senior1' as const, level: 'point' as const, parentId: 47, description: '学习现在完成进行时的构成和用法', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'senior1' as const, level: 'section' as const, parentId: 46, description: 'Unit 1词汇部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '校园生活', subject: 'english' as const, grade: 'senior1' as const, level: 'point' as const, parentId: 49, description: '学习高中校园生活相关词汇', difficulty: 'medium' as const, semester: 'first' as const },
  
  { name: 'Unit 2', subject: 'english' as const, grade: 'senior1' as const, level: 'chapter' as const, parentId: null, description: '高一上册Unit 2', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'senior1' as const, level: 'section' as const, parentId: 51, description: 'Unit 2语法部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '现在完成时与现在完成进行时对比', subject: 'english' as const, grade: 'senior1' as const, level: 'point' as const, parentId: 52, description: '学习两种时态的区别和用法', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'senior1' as const, level: 'section' as const, parentId: 51, description: 'Unit 2词汇部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '旅行与探险', subject: 'english' as const, grade: 'senior1' as const, level: 'point' as const, parentId: 54, description: '学习旅行和探险相关词汇', difficulty: 'medium' as const, semester: 'first' as const },
  
  { name: 'Unit 3', subject: 'english' as const, grade: 'senior1' as const, level: 'chapter' as const, parentId: null, description: '高一上册Unit 3', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'senior1' as const, level: 'section' as const, parentId: 56, description: 'Unit 3语法部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '情态动词的完成式', subject: 'english' as const, grade: 'senior1' as const, level: 'point' as const, parentId: 57, description: '学习情态动词+have done的用法', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'senior1' as const, level: 'section' as const, parentId: 56, description: 'Unit 3词汇部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '体育运动', subject: 'english' as const, grade: 'senior1' as const, level: 'point' as const, parentId: 59, description: '学习体育运动相关词汇', difficulty: 'medium' as const, semester: 'first' as const },
  
  // 高二上册
  { name: 'Unit 1', subject: 'english' as const, grade: 'senior2' as const, level: 'chapter' as const, parentId: null, description: '高二上册Unit 1', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'senior2' as const, level: 'section' as const, parentId: 61, description: 'Unit 1语法部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '主语从句', subject: 'english' as const, grade: 'senior2' as const, level: 'point' as const, parentId: 62, description: '学习主语从句的引导词和用法', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'senior2' as const, level: 'section' as const, parentId: 61, description: 'Unit 1词汇部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '科学家与成就', subject: 'english' as const, grade: 'senior2' as const, level: 'point' as const, parentId: 64, description: '学习科学家和成就相关词汇', difficulty: 'hard' as const, semester: 'first' as const },
  
  { name: 'Unit 2', subject: 'english' as const, grade: 'senior2' as const, level: 'chapter' as const, parentId: null, description: '高二上册Unit 2', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'senior2' as const, level: 'section' as const, parentId: 66, description: 'Unit 2语法部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '表语从句', subject: 'english' as const, grade: 'senior2' as const, level: 'point' as const, parentId: 67, description: '学习表语从句的引导词和用法', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Vocabulary', subject: 'english' as const, grade: 'senior2' as const, level: 'section' as const, parentId: 66, description: 'Unit 2词汇部分', difficulty: 'medium' as const, semester: 'first' as const },
  { name: '科技与生活', subject: 'english' as const, grade: 'senior2' as const, level: 'point' as const, parentId: 69, description: '学习科技与生活相关词汇', difficulty: 'medium' as const, semester: 'first' as const },
  
  // 高三上册
  { name: '专题复习', subject: 'english' as const, grade: 'senior3' as const, level: 'chapter' as const, parentId: null, description: '高三上册专题复习', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Grammar', subject: 'english' as const, grade: 'senior3' as const, level: 'section' as const, parentId: 71, description: '专题复习语法部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '时态综合', subject: 'english' as const, grade: 'senior3' as const, level: 'point' as const, parentId: 72, description: '综合复习各种时态的用法', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '从句综合', subject: 'english' as const, grade: 'senior3' as const, level: 'point' as const, parentId: 72, description: '综合复习名词性从句、定语从句、状语从句', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '非谓语动词', subject: 'english' as const, grade: 'senior3' as const, level: 'point' as const, parentId: 72, description: '综合复习不定式、动名词、分词', difficulty: 'hard' as const, semester: 'first' as const },
  { name: 'Skills', subject: 'english' as const, grade: 'senior3' as const, level: 'section' as const, parentId: 71, description: '专题复习技能部分', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '阅读理解技巧', subject: 'english' as const, grade: 'senior3' as const, level: 'point' as const, parentId: 76, description: '掌握阅读理解的解题技巧', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '完形填空技巧', subject: 'english' as const, grade: 'senior3' as const, level: 'point' as const, parentId: 76, description: '掌握完形填空的解题技巧', difficulty: 'hard' as const, semester: 'first' as const },
  { name: '写作技巧', subject: 'english' as const, grade: 'senior3' as const, level: 'point' as const, parentId: 76, description: '掌握各类作文的写作技巧', difficulty: 'hard' as const, semester: 'first' as const },
];

async function importEnglishKnowledge() {
  console.log('开始导入英语学科知识点数据...');
  console.log(`共${englishKnowledgeData.length}条数据待导入\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const kp of englishKnowledgeData) {
    try {
      await db.insert(knowledgePoints).values(kp);
      successCount++;
      console.log(`✓ [${successCount}/${englishKnowledgeData.length}] 已导入: ${kp.name} (${kp.level})`);
    } catch (error: any) {
      errorCount++;
      console.error(`✗ 导入失败: ${kp.name}`, error.message);
    }
  }
  
  console.log(`\n导入完成！成功: ${successCount}, 失败: ${errorCount}`);
  process.exit(errorCount > 0 ? 1 : 0);
}

importEnglishKnowledge().catch((error: any) => {
  console.error('导入过程出错:', error);
  process.exit(1);
});
