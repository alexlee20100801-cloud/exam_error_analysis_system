import { db } from '../server/db.ts';
import { knowledgePoints } from '../drizzle/schema.ts';

// 深圳初高中英语知识点数据（基于沪教牛津版/人教版）
const englishKnowledgeData = [
  // ==================== 初中英语 ====================
  
  // 七年级上册
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 1',
    section: 'Grammar',
    knowledgePoint: 'be动词的用法',
    difficulty: 'easy',
    description: '学习am, is, are的用法和区别'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 1',
    section: 'Vocabulary',
    knowledgePoint: '问候与介绍',
    difficulty: 'easy',
    description: '学习基本的问候语和自我介绍'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 2',
    section: 'Grammar',
    knowledgePoint: '指示代词this/that',
    difficulty: 'easy',
    description: '学习this, that, these, those的用法'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 2',
    section: 'Vocabulary',
    knowledgePoint: '家庭成员',
    difficulty: 'easy',
    description: '学习家庭成员的英文表达'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 3',
    section: 'Grammar',
    knowledgePoint: '名词所有格',
    difficulty: 'easy',
    description: '学习\'s和of表示所属关系'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 3',
    section: 'Vocabulary',
    knowledgePoint: '学校用品',
    difficulty: 'easy',
    description: '学习常见学校用品的英文表达'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 4',
    section: 'Grammar',
    knowledgePoint: 'where引导的特殊疑问句',
    difficulty: 'easy',
    description: '学习询问地点的疑问句'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 4',
    section: 'Vocabulary',
    knowledgePoint: '房间与家具',
    difficulty: 'easy',
    description: '学习房间和家具的英文表达'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 5',
    section: 'Grammar',
    knowledgePoint: '一般现在时',
    difficulty: 'medium',
    description: '学习一般现在时的构成和用法'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 5',
    section: 'Vocabulary',
    knowledgePoint: '运动与爱好',
    difficulty: 'easy',
    description: '学习运动和爱好的英文表达'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 6',
    section: 'Grammar',
    knowledgePoint: '可数名词与不可数名词',
    difficulty: 'medium',
    description: '学习可数和不可数名词的区别和用法'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '上册',
    chapter: 'Unit 6',
    section: 'Vocabulary',
    knowledgePoint: '食物与饮料',
    difficulty: 'easy',
    description: '学习食物和饮料的英文表达'
  },

  // 七年级下册
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 1',
    section: 'Grammar',
    knowledgePoint: '情态动词can',
    difficulty: 'medium',
    description: '学习can表示能力和请求的用法'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 1',
    section: 'Vocabulary',
    knowledgePoint: '才能与技能',
    difficulty: 'easy',
    description: '学习描述才能和技能的词汇'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 2',
    section: 'Grammar',
    knowledgePoint: '时间表达法',
    difficulty: 'medium',
    description: '学习询问和表达时间'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 2',
    section: 'Vocabulary',
    knowledgePoint: '日常作息',
    difficulty: 'easy',
    description: '学习日常作息活动的英文表达'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 3',
    section: 'Grammar',
    knowledgePoint: 'how引导的特殊疑问句',
    difficulty: 'medium',
    description: '学习询问方式和程度的疑问句'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 3',
    section: 'Vocabulary',
    knowledgePoint: '交通方式',
    difficulty: 'easy',
    description: '学习各种交通方式的英文表达'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 4',
    section: 'Grammar',
    knowledgePoint: '祈使句',
    difficulty: 'medium',
    description: '学习祈使句的构成和用法'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 4',
    section: 'Vocabulary',
    knowledgePoint: '规则与制度',
    difficulty: 'medium',
    description: '学习描述规则和制度的词汇'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 5',
    section: 'Grammar',
    knowledgePoint: '现在进行时',
    difficulty: 'medium',
    description: '学习现在进行时的构成和用法'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 5',
    section: 'Vocabulary',
    knowledgePoint: '动物',
    difficulty: 'easy',
    description: '学习动物的英文表达和描述'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 6',
    section: 'Grammar',
    knowledgePoint: '一般现在时与现在进行时对比',
    difficulty: 'medium',
    description: '学习两种时态的区别和用法'
  },
  {
    subject: '英语',
    grade: '七年级',
    semester: '下册',
    chapter: 'Unit 6',
    section: 'Vocabulary',
    knowledgePoint: '日常活动',
    difficulty: 'easy',
    description: '学习描述日常活动的词汇'
  },

  // 八年级上册
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 1',
    section: 'Grammar',
    knowledgePoint: '一般过去时',
    difficulty: 'medium',
    description: '学习一般过去时的构成和用法'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 1',
    section: 'Vocabulary',
    knowledgePoint: '假期活动',
    difficulty: 'easy',
    description: '学习描述假期活动的词汇'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 2',
    section: 'Grammar',
    knowledgePoint: '频率副词',
    difficulty: 'medium',
    description: '学习频率副词的用法和位置'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 2',
    section: 'Vocabulary',
    knowledgePoint: '健康习惯',
    difficulty: 'medium',
    description: '学习描述健康习惯的词汇'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 3',
    section: 'Grammar',
    knowledgePoint: '形容词比较级和最高级',
    difficulty: 'medium',
    description: '学习形容词的比较级和最高级形式'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 3',
    section: 'Vocabulary',
    knowledgePoint: '个人特征',
    difficulty: 'medium',
    description: '学习描述个人特征的词汇'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 4',
    section: 'Grammar',
    knowledgePoint: '副词比较级和最高级',
    difficulty: 'medium',
    description: '学习副词的比较级和最高级形式'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 4',
    section: 'Vocabulary',
    knowledgePoint: '娱乐场所',
    difficulty: 'medium',
    description: '学习娱乐场所的英文表达'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 5',
    section: 'Grammar',
    knowledgePoint: '动词不定式',
    difficulty: 'hard',
    description: '学习动词不定式的用法'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 5',
    section: 'Vocabulary',
    knowledgePoint: '电视节目',
    difficulty: 'medium',
    description: '学习电视节目类型的英文表达'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 6',
    section: 'Grammar',
    knowledgePoint: '一般将来时be going to',
    difficulty: 'medium',
    description: '学习be going to表示将来的用法'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '上册',
    chapter: 'Unit 6',
    section: 'Vocabulary',
    knowledgePoint: '职业与理想',
    difficulty: 'medium',
    description: '学习职业和理想的英文表达'
  },

  // 八年级下册
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 1',
    section: 'Grammar',
    knowledgePoint: '现在完成时',
    difficulty: 'hard',
    description: '学习现在完成时的构成和用法'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 1',
    section: 'Vocabulary',
    knowledgePoint: '健康与疾病',
    difficulty: 'medium',
    description: '学习健康和疾病的英文表达'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 2',
    section: 'Grammar',
    knowledgePoint: '现在完成时与一般过去时对比',
    difficulty: 'hard',
    description: '学习两种时态的区别'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 2',
    section: 'Vocabulary',
    knowledgePoint: '志愿活动',
    difficulty: 'medium',
    description: '学习志愿活动的英文表达'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 3',
    section: 'Grammar',
    knowledgePoint: '情态动词could/should',
    difficulty: 'medium',
    description: '学习could和should的用法'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 3',
    section: 'Vocabulary',
    knowledgePoint: '家务劳动',
    difficulty: 'easy',
    description: '学习家务劳动的英文表达'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 4',
    section: 'Grammar',
    knowledgePoint: '连词until/so that/although',
    difficulty: 'hard',
    description: '学习复合句连词的用法'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 4',
    section: 'Vocabulary',
    knowledgePoint: '人际关系',
    difficulty: 'medium',
    description: '学习描述人际关系的词汇'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 5',
    section: 'Grammar',
    knowledgePoint: '过去进行时',
    difficulty: 'medium',
    description: '学习过去进行时的构成和用法'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 5',
    section: 'Vocabulary',
    knowledgePoint: '天气与自然灾害',
    difficulty: 'medium',
    description: '学习天气和自然灾害的英文表达'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 6',
    section: 'Grammar',
    knowledgePoint: '状语从句',
    difficulty: 'hard',
    description: '学习时间、条件、原因状语从句'
  },
  {
    subject: '英语',
    grade: '八年级',
    semester: '下册',
    chapter: 'Unit 6',
    section: 'Vocabulary',
    knowledgePoint: '童话故事',
    difficulty: 'medium',
    description: '学习童话故事相关词汇'
  },

  // 九年级上册
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 1',
    section: 'Grammar',
    knowledgePoint: '动名词作宾语',
    difficulty: 'hard',
    description: '学习动名词在句中作宾语的用法'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 1',
    section: 'Vocabulary',
    knowledgePoint: '学习方法',
    difficulty: 'medium',
    description: '学习描述学习方法的词汇'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 2',
    section: 'Grammar',
    knowledgePoint: '宾语从句',
    difficulty: 'hard',
    description: '学习宾语从句的引导词和语序'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 2',
    section: 'Vocabulary',
    knowledgePoint: '节日与庆祝',
    difficulty: 'medium',
    description: '学习节日和庆祝活动的英文表达'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 3',
    section: 'Grammar',
    knowledgePoint: '宾语从句的时态',
    difficulty: 'hard',
    description: '学习宾语从句中的时态呼应'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 3',
    section: 'Vocabulary',
    knowledgePoint: '问路与指路',
    difficulty: 'medium',
    description: '学习问路和指路的英文表达'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 4',
    section: 'Grammar',
    knowledgePoint: 'used to的用法',
    difficulty: 'medium',
    description: '学习used to表示过去习惯的用法'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 4',
    section: 'Vocabulary',
    knowledgePoint: '性格变化',
    difficulty: 'medium',
    description: '学习描述性格变化的词汇'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 5',
    section: 'Grammar',
    knowledgePoint: '被动语态（一般现在时）',
    difficulty: 'hard',
    description: '学习一般现在时的被动语态'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 5',
    section: 'Vocabulary',
    knowledgePoint: '产品与材料',
    difficulty: 'medium',
    description: '学习产品和材料的英文表达'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 6',
    section: 'Grammar',
    knowledgePoint: '被动语态（一般过去时）',
    difficulty: 'hard',
    description: '学习一般过去时的被动语态'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '上册',
    chapter: 'Unit 6',
    section: 'Vocabulary',
    knowledgePoint: '发明与创造',
    difficulty: 'medium',
    description: '学习发明和创造的英文表达'
  },

  // 九年级下册
  {
    subject: '英语',
    grade: '九年级',
    semester: '下册',
    chapter: 'Unit 1',
    section: 'Grammar',
    knowledgePoint: '情态动词表推测',
    difficulty: 'hard',
    description: '学习must/might/could/can\'t表推测'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '下册',
    chapter: 'Unit 1',
    section: 'Vocabulary',
    knowledgePoint: '音乐类型',
    difficulty: 'medium',
    description: '学习音乐类型的英文表达'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '下册',
    chapter: 'Unit 2',
    section: 'Grammar',
    knowledgePoint: '定语从句',
    difficulty: 'hard',
    description: '学习定语从句的关系代词和关系副词'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '下册',
    chapter: 'Unit 2',
    section: 'Vocabulary',
    knowledgePoint: '风俗习惯',
    difficulty: 'medium',
    description: '学习描述风俗习惯的词汇'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '下册',
    chapter: 'Unit 3',
    section: 'Grammar',
    knowledgePoint: '定语从句的省略',
    difficulty: 'hard',
    description: '学习定语从句关系代词的省略'
  },
  {
    subject: '英语',
    grade: '九年级',
    semester: '下册',
    chapter: 'Unit 3',
    section: 'Vocabulary',
    knowledgePoint: '旅游与景点',
    difficulty: 'medium',
    description: '学习旅游和景点的英文表达'
  },

  // ==================== 高中英语 ====================
  
  // 必修一
  {
    subject: '英语',
    grade: '高一',
    semester: '上册',
    chapter: 'Unit 1',
    section: 'Grammar',
    knowledgePoint: '现在完成进行时',
    difficulty: 'hard',
    description: '学习现在完成进行时的构成和用法'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '上册',
    chapter: 'Unit 1',
    section: 'Vocabulary',
    knowledgePoint: '校园生活',
    difficulty: 'medium',
    description: '学习高中校园生活相关词汇'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '上册',
    chapter: 'Unit 2',
    section: 'Grammar',
    knowledgePoint: '现在完成时与现在完成进行时对比',
    difficulty: 'hard',
    description: '学习两种时态的区别和用法'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '上册',
    chapter: 'Unit 2',
    section: 'Vocabulary',
    knowledgePoint: '旅行与探险',
    difficulty: 'medium',
    description: '学习旅行和探险相关词汇'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '上册',
    chapter: 'Unit 3',
    section: 'Grammar',
    knowledgePoint: '情态动词的完成式',
    difficulty: 'hard',
    description: '学习情态动词+have done的用法'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '上册',
    chapter: 'Unit 3',
    section: 'Vocabulary',
    knowledgePoint: '体育运动',
    difficulty: 'medium',
    description: '学习体育运动相关词汇'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '上册',
    chapter: 'Unit 4',
    section: 'Grammar',
    knowledgePoint: '限制性定语从句',
    difficulty: 'hard',
    description: '深入学习限制性定语从句'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '上册',
    chapter: 'Unit 4',
    section: 'Vocabulary',
    knowledgePoint: '自然灾害',
    difficulty: 'medium',
    description: '学习自然灾害相关词汇'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '上册',
    chapter: 'Unit 5',
    section: 'Grammar',
    knowledgePoint: '非限制性定语从句',
    difficulty: 'hard',
    description: '学习非限制性定语从句的用法'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '上册',
    chapter: 'Unit 5',
    section: 'Vocabulary',
    knowledgePoint: '语言学习',
    difficulty: 'medium',
    description: '学习语言学习相关词汇'
  },

  // 必修二
  {
    subject: '英语',
    grade: '高一',
    semester: '下册',
    chapter: 'Unit 1',
    section: 'Grammar',
    knowledgePoint: '现在进行时表将来',
    difficulty: 'medium',
    description: '学习现在进行时表示将来的用法'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '下册',
    chapter: 'Unit 1',
    section: 'Vocabulary',
    knowledgePoint: '文化遗产',
    difficulty: 'hard',
    description: '学习文化遗产相关词汇'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '下册',
    chapter: 'Unit 2',
    section: 'Grammar',
    knowledgePoint: '现在进行时的被动语态',
    difficulty: 'hard',
    description: '学习现在进行时被动语态的构成'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '下册',
    chapter: 'Unit 2',
    section: 'Vocabulary',
    knowledgePoint: '野生动物保护',
    difficulty: 'medium',
    description: '学习野生动物保护相关词汇'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '下册',
    chapter: 'Unit 3',
    section: 'Grammar',
    knowledgePoint: '将来时的被动语态',
    difficulty: 'hard',
    description: '学习将来时被动语态的构成'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '下册',
    chapter: 'Unit 3',
    section: 'Vocabulary',
    knowledgePoint: '互联网',
    difficulty: 'medium',
    description: '学习互联网相关词汇'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '下册',
    chapter: 'Unit 4',
    section: 'Grammar',
    knowledgePoint: '现在完成时的被动语态',
    difficulty: 'hard',
    description: '学习现在完成时被动语态的构成'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '下册',
    chapter: 'Unit 4',
    section: 'Vocabulary',
    knowledgePoint: '历史与文化',
    difficulty: 'hard',
    description: '学习历史和文化相关词汇'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '下册',
    chapter: 'Unit 5',
    section: 'Grammar',
    knowledgePoint: '过去分词作表语和状语',
    difficulty: 'hard',
    description: '学习过去分词的非谓语用法'
  },
  {
    subject: '英语',
    grade: '高一',
    semester: '下册',
    chapter: 'Unit 5',
    section: 'Vocabulary',
    knowledgePoint: '音乐',
    difficulty: 'medium',
    description: '学习音乐相关词汇'
  },

  // 选择性必修一
  {
    subject: '英语',
    grade: '高二',
    semester: '上册',
    chapter: 'Unit 1',
    section: 'Grammar',
    knowledgePoint: '主语从句',
    difficulty: 'hard',
    description: '学习主语从句的引导词和用法'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '上册',
    chapter: 'Unit 1',
    section: 'Vocabulary',
    knowledgePoint: '科学家与成就',
    difficulty: 'hard',
    description: '学习科学家和成就相关词汇'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '上册',
    chapter: 'Unit 2',
    section: 'Grammar',
    knowledgePoint: '表语从句',
    difficulty: 'hard',
    description: '学习表语从句的引导词和用法'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '上册',
    chapter: 'Unit 2',
    section: 'Vocabulary',
    knowledgePoint: '科技与生活',
    difficulty: 'medium',
    description: '学习科技与生活相关词汇'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '上册',
    chapter: 'Unit 3',
    section: 'Grammar',
    knowledgePoint: '动词-ing形式作主语',
    difficulty: 'hard',
    description: '学习动名词作主语的用法'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '上册',
    chapter: 'Unit 3',
    section: 'Vocabulary',
    knowledgePoint: '环境保护',
    difficulty: 'medium',
    description: '学习环境保护相关词汇'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '上册',
    chapter: 'Unit 4',
    section: 'Grammar',
    knowledgePoint: '过去将来时',
    difficulty: 'hard',
    description: '学习过去将来时的构成和用法'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '上册',
    chapter: 'Unit 4',
    section: 'Vocabulary',
    knowledgePoint: '肢体语言',
    difficulty: 'medium',
    description: '学习肢体语言相关词汇'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '上册',
    chapter: 'Unit 5',
    section: 'Grammar',
    knowledgePoint: '主谓一致',
    difficulty: 'hard',
    description: '学习主谓一致的规则'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '上册',
    chapter: 'Unit 5',
    section: 'Vocabulary',
    knowledgePoint: '农业与粮食',
    difficulty: 'medium',
    description: '学习农业和粮食相关词汇'
  },

  // 选择性必修二
  {
    subject: '英语',
    grade: '高二',
    semester: '下册',
    chapter: 'Unit 1',
    section: 'Grammar',
    knowledgePoint: '同位语从句',
    difficulty: 'hard',
    description: '学习同位语从句的引导词和用法'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '下册',
    chapter: 'Unit 1',
    section: 'Vocabulary',
    knowledgePoint: '新闻媒体',
    difficulty: 'medium',
    description: '学习新闻媒体相关词汇'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '下册',
    chapter: 'Unit 2',
    section: 'Grammar',
    knowledgePoint: '虚拟语气（条件句）',
    difficulty: 'hard',
    description: '学习虚拟条件句的用法'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '下册',
    chapter: 'Unit 2',
    section: 'Vocabulary',
    knowledgePoint: '留学教育',
    difficulty: 'medium',
    description: '学习留学教育相关词汇'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '下册',
    chapter: 'Unit 3',
    section: 'Grammar',
    knowledgePoint: '虚拟语气（其他用法）',
    difficulty: 'hard',
    description: '学习虚拟语气在建议、命令等句型中的用法'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '下册',
    chapter: 'Unit 3',
    section: 'Vocabulary',
    knowledgePoint: '饮食健康',
    difficulty: 'medium',
    description: '学习饮食健康相关词汇'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '下册',
    chapter: 'Unit 4',
    section: 'Grammar',
    knowledgePoint: '强调句',
    difficulty: 'hard',
    description: '学习it is...that强调句型'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '下册',
    chapter: 'Unit 4',
    section: 'Vocabulary',
    knowledgePoint: '科学探索',
    difficulty: 'hard',
    description: '学习科学探索相关词汇'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '下册',
    chapter: 'Unit 5',
    section: 'Grammar',
    knowledgePoint: '倒装句',
    difficulty: 'hard',
    description: '学习完全倒装和部分倒装'
  },
  {
    subject: '英语',
    grade: '高二',
    semester: '下册',
    chapter: 'Unit 5',
    section: 'Vocabulary',
    knowledgePoint: '急救',
    difficulty: 'medium',
    description: '学习急救相关词汇'
  },

  // 高三复习
  {
    subject: '英语',
    grade: '高三',
    semester: '上册',
    chapter: '专题复习',
    section: 'Grammar',
    knowledgePoint: '时态综合',
    difficulty: 'hard',
    description: '综合复习各种时态的用法'
  },
  {
    subject: '英语',
    grade: '高三',
    semester: '上册',
    chapter: '专题复习',
    section: 'Grammar',
    knowledgePoint: '从句综合',
    difficulty: 'hard',
    description: '综合复习名词性从句、定语从句、状语从句'
  },
  {
    subject: '英语',
    grade: '高三',
    semester: '上册',
    chapter: '专题复习',
    section: 'Grammar',
    knowledgePoint: '非谓语动词',
    difficulty: 'hard',
    description: '综合复习不定式、动名词、分词'
  },
  {
    subject: '英语',
    grade: '高三',
    semester: '上册',
    chapter: '专题复习',
    section: 'Skills',
    knowledgePoint: '阅读理解技巧',
    difficulty: 'hard',
    description: '掌握阅读理解的解题技巧'
  },
  {
    subject: '英语',
    grade: '高三',
    semester: '上册',
    chapter: '专题复习',
    section: 'Skills',
    knowledgePoint: '完形填空技巧',
    difficulty: 'hard',
    description: '掌握完形填空的解题技巧'
  },
  {
    subject: '英语',
    grade: '高三',
    semester: '上册',
    chapter: '专题复习',
    section: 'Skills',
    knowledgePoint: '写作技巧',
    difficulty: 'hard',
    description: '掌握各类作文的写作技巧'
  },
  {
    subject: '英语',
    grade: '高三',
    semester: '下册',
    chapter: '冲刺复习',
    section: '综合',
    knowledgePoint: '高考真题训练',
    difficulty: 'hard',
    description: '通过真题训练提高应试能力'
  },
  {
    subject: '英语',
    grade: '高三',
    semester: '下册',
    chapter: '冲刺复习',
    section: '综合',
    knowledgePoint: '答题策略',
    difficulty: 'hard',
    description: '掌握各题型的答题策略'
  },
  {
    subject: '英语',
    grade: '高三',
    semester: '下册',
    chapter: '冲刺复习',
    section: '综合',
    knowledgePoint: '时间管理',
    difficulty: 'hard',
    description: '学习考试时间分配和管理'
  }
];

async function importEnglishKnowledge() {
  console.log('开始导入英语学科知识点数据...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const kp of englishKnowledgeData) {
    try {
      await db.insert(knowledgePoints).values(kp);
      successCount++;
      console.log(`✓ 已导入: ${kp.grade} ${kp.semester} - ${kp.chapter} - ${kp.knowledgePoint}`);
    } catch (error) {
      errorCount++;
      console.error(`✗ 导入失败: ${kp.grade} ${kp.semester} - ${kp.chapter} - ${kp.knowledgePoint}`, error);
    }
  }
  
  console.log(`\n导入完成！成功: ${successCount}, 失败: ${errorCount}`);
}

importEnglishKnowledge().catch(console.error);
