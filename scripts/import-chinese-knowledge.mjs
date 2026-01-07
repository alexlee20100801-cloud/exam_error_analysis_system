import { db } from '../server/db.ts';
import { knowledgePoints } from '../drizzle/schema.ts';

// 深圳初高中语文知识点数据（基于人教版统编教材）
const chineseKnowledgeData = [
  // ==================== 初中语文 ====================
  
  // 七年级上册
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第一单元',
    section: '阅读',
    knowledgePoint: '朗读与默读',
    difficulty: 'easy',
    description: '学习正确的朗读方法，培养默读习惯，提高阅读速度'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第一单元',
    section: '写作',
    knowledgePoint: '热爱生活，热爱写作',
    difficulty: 'easy',
    description: '从生活中寻找写作素材，培养观察和表达能力'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第二单元',
    section: '阅读',
    knowledgePoint: '整体感知',
    difficulty: 'easy',
    description: '把握文章主要内容，理解作者情感态度'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第二单元',
    section: '写作',
    knowledgePoint: '学会记事',
    difficulty: 'easy',
    description: '掌握记叙文的基本要素和写作方法'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第三单元',
    section: '阅读',
    knowledgePoint: '精读',
    difficulty: 'medium',
    description: '学习精读方法，深入理解文章内涵'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第三单元',
    section: '写作',
    knowledgePoint: '写人要抓住特点',
    difficulty: 'medium',
    description: '通过外貌、语言、动作、心理描写刻画人物'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第四单元',
    section: '阅读',
    knowledgePoint: '默读与圈点勾画',
    difficulty: 'medium',
    description: '培养边读边思考的习惯，学会做批注'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第四单元',
    section: '写作',
    knowledgePoint: '思路要清晰',
    difficulty: 'medium',
    description: '学习理清写作思路，使文章条理清楚'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第五单元',
    section: '阅读',
    knowledgePoint: '跳读与猜读',
    difficulty: 'medium',
    description: '学习快速阅读方法，培养信息筛选能力'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第五单元',
    section: '写作',
    knowledgePoint: '如何突出中心',
    difficulty: 'medium',
    description: '学习围绕中心选择材料和组织材料'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第六单元',
    section: '阅读',
    knowledgePoint: '联想与想象',
    difficulty: 'medium',
    description: '理解联想和想象在文学作品中的作用'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '上册',
    chapter: '第六单元',
    section: '写作',
    knowledgePoint: '发挥联想和想象',
    difficulty: 'medium',
    description: '运用联想和想象丰富文章内容'
  },

  // 七年级下册
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第一单元',
    section: '阅读',
    knowledgePoint: '把握内容，理解情感',
    difficulty: 'easy',
    description: '学习理解文章内容和作者情感'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第一单元',
    section: '写作',
    knowledgePoint: '写出人物的精神',
    difficulty: 'medium',
    description: '通过具体事例表现人物精神品质'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第二单元',
    section: '阅读',
    knowledgePoint: '品味语言',
    difficulty: 'medium',
    description: '学习赏析文章的语言特色'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第二单元',
    section: '写作',
    knowledgePoint: '学习抒情',
    difficulty: 'medium',
    description: '掌握直接抒情和间接抒情的方法'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第三单元',
    section: '阅读',
    knowledgePoint: '抓住关键语句',
    difficulty: 'medium',
    description: '学习通过关键语句理解文章主旨'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第三单元',
    section: '写作',
    knowledgePoint: '抓住细节',
    difficulty: 'medium',
    description: '通过细节描写使文章生动具体'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第四单元',
    section: '阅读',
    knowledgePoint: '理清思路',
    difficulty: 'medium',
    description: '学习梳理文章的行文思路'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第四单元',
    section: '写作',
    knowledgePoint: '怎样选材',
    difficulty: 'medium',
    description: '学习根据主题选择合适的材料'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第五单元',
    section: '阅读',
    knowledgePoint: '把握文章内容要点',
    difficulty: 'medium',
    description: '学习概括文章的主要内容'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第五单元',
    section: '写作',
    knowledgePoint: '文从字顺',
    difficulty: 'medium',
    description: '学习使文章语句通顺、表达清楚'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第六单元',
    section: '阅读',
    knowledgePoint: '理解作者观点',
    difficulty: 'medium',
    description: '学习理解和评价作者的观点态度'
  },
  {
    subject: '语文',
    grade: '七年级',
    semester: '下册',
    chapter: '第六单元',
    section: '写作',
    knowledgePoint: '语言简明',
    difficulty: 'medium',
    description: '学习使语言表达简洁明了'
  },

  // 八年级上册
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第一单元',
    section: '阅读',
    knowledgePoint: '新闻阅读',
    difficulty: 'medium',
    description: '学习新闻的特点和阅读方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第一单元',
    section: '写作',
    knowledgePoint: '新闻写作',
    difficulty: 'medium',
    description: '学习新闻的基本写作方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第二单元',
    section: '阅读',
    knowledgePoint: '传记阅读',
    difficulty: 'medium',
    description: '了解传记的特点，学习阅读传记'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第二单元',
    section: '写作',
    knowledgePoint: '学写传记',
    difficulty: 'medium',
    description: '学习人物传记的写作方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第三单元',
    section: '阅读',
    knowledgePoint: '建筑园林说明文',
    difficulty: 'medium',
    description: '学习说明文的阅读方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第三单元',
    section: '写作',
    knowledgePoint: '学习描写景物',
    difficulty: 'medium',
    description: '学习景物描写的方法和技巧'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第四单元',
    section: '阅读',
    knowledgePoint: '科技说明文',
    difficulty: 'medium',
    description: '学习科技说明文的特点和阅读方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第四单元',
    section: '写作',
    knowledgePoint: '语言要连贯',
    difficulty: 'medium',
    description: '学习使文章语言连贯流畅'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第五单元',
    section: '阅读',
    knowledgePoint: '说明方法',
    difficulty: 'medium',
    description: '学习各种说明方法及其作用'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第五单元',
    section: '写作',
    knowledgePoint: '说明事物要抓住特征',
    difficulty: 'medium',
    description: '学习抓住事物特征进行说明'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第六单元',
    section: '阅读',
    knowledgePoint: '文言文阅读',
    difficulty: 'hard',
    description: '学习文言文的基本阅读方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '上册',
    chapter: '第六单元',
    section: '写作',
    knowledgePoint: '表达要得体',
    difficulty: 'medium',
    description: '学习根据场合和对象得体表达'
  },

  // 八年级下册
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第一单元',
    section: '阅读',
    knowledgePoint: '民俗文化',
    difficulty: 'medium',
    description: '了解民俗文化，学习相关文章的阅读'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第一单元',
    section: '写作',
    knowledgePoint: '学习仿写',
    difficulty: 'medium',
    description: '学习仿写的方法和技巧'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第二单元',
    section: '阅读',
    knowledgePoint: '游记散文',
    difficulty: 'medium',
    description: '学习游记散文的特点和阅读方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第二单元',
    section: '写作',
    knowledgePoint: '说明的顺序',
    difficulty: 'medium',
    description: '学习时间顺序、空间顺序、逻辑顺序'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第三单元',
    section: '阅读',
    knowledgePoint: '科普文章',
    difficulty: 'medium',
    description: '学习科普文章的阅读方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第三单元',
    section: '写作',
    knowledgePoint: '学写读后感',
    difficulty: 'medium',
    description: '学习读后感的写作方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第四单元',
    section: '阅读',
    knowledgePoint: '演讲稿',
    difficulty: 'medium',
    description: '了解演讲稿的特点和阅读方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第四单元',
    section: '写作',
    knowledgePoint: '撰写演讲稿',
    difficulty: 'medium',
    description: '学习演讲稿的写作方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第五单元',
    section: '阅读',
    knowledgePoint: '古代游记',
    difficulty: 'hard',
    description: '学习古代游记的阅读方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第五单元',
    section: '写作',
    knowledgePoint: '学写游记',
    difficulty: 'medium',
    description: '学习游记的写作方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第六单元',
    section: '阅读',
    knowledgePoint: '古代诗歌',
    difficulty: 'hard',
    description: '学习古代诗歌的鉴赏方法'
  },
  {
    subject: '语文',
    grade: '八年级',
    semester: '下册',
    chapter: '第六单元',
    section: '写作',
    knowledgePoint: '学写故事',
    difficulty: 'medium',
    description: '学习故事的写作方法'
  },

  // 九年级上册
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第一单元',
    section: '阅读',
    knowledgePoint: '诗歌鉴赏',
    difficulty: 'hard',
    description: '学习现代诗歌的鉴赏方法'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第一单元',
    section: '写作',
    knowledgePoint: '尝试创作诗歌',
    difficulty: 'hard',
    description: '学习诗歌的创作方法'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第二单元',
    section: '阅读',
    knowledgePoint: '议论文阅读',
    difficulty: 'hard',
    description: '学习议论文的论点、论据、论证'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第二单元',
    section: '写作',
    knowledgePoint: '观点要明确',
    difficulty: 'hard',
    description: '学习在议论文中明确提出观点'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第三单元',
    section: '阅读',
    knowledgePoint: '小说阅读',
    difficulty: 'hard',
    description: '学习小说的人物、情节、环境'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第三单元',
    section: '写作',
    knowledgePoint: '学习改写',
    difficulty: 'hard',
    description: '学习改写的方法和技巧'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第四单元',
    section: '阅读',
    knowledgePoint: '议论文论证方法',
    difficulty: 'hard',
    description: '学习举例论证、道理论证、对比论证等'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第四单元',
    section: '写作',
    knowledgePoint: '论证要合理',
    difficulty: 'hard',
    description: '学习合理运用论据和论证方法'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第五单元',
    section: '阅读',
    knowledgePoint: '古代白话小说',
    difficulty: 'hard',
    description: '学习古代白话小说的阅读方法'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第五单元',
    section: '写作',
    knowledgePoint: '学习缩写',
    difficulty: 'medium',
    description: '学习缩写的方法和技巧'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第六单元',
    section: '阅读',
    knowledgePoint: '古代议论文',
    difficulty: 'hard',
    description: '学习古代议论文的阅读方法'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '上册',
    chapter: '第六单元',
    section: '写作',
    knowledgePoint: '学习扩写',
    difficulty: 'medium',
    description: '学习扩写的方法和技巧'
  },

  // 九年级下册
  {
    subject: '语文',
    grade: '九年级',
    semester: '下册',
    chapter: '第一单元',
    section: '阅读',
    knowledgePoint: '现代诗歌',
    difficulty: 'hard',
    description: '深入学习现代诗歌的鉴赏'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '下册',
    chapter: '第一单元',
    section: '写作',
    knowledgePoint: '审题立意',
    difficulty: 'hard',
    description: '学习准确审题和确立文章主旨'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '下册',
    chapter: '第二单元',
    section: '阅读',
    knowledgePoint: '小说主题',
    difficulty: 'hard',
    description: '学习理解和分析小说主题'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '下册',
    chapter: '第二单元',
    section: '写作',
    knowledgePoint: '布局谋篇',
    difficulty: 'hard',
    description: '学习文章的整体布局和谋篇'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '下册',
    chapter: '第三单元',
    section: '阅读',
    knowledgePoint: '戏剧阅读',
    difficulty: 'hard',
    description: '学习戏剧的特点和阅读方法'
  },
  {
    subject: '语文',
    grade: '九年级',
    semester: '下册',
    chapter: '第三单元',
    section: '写作',
    knowledgePoint: '有创意地表达',
    difficulty: 'hard',
    description: '学习创新性的表达方式'
  },

  // ==================== 高中语文 ====================
  
  // 必修上册
  {
    subject: '语文',
    grade: '高一',
    semester: '上册',
    chapter: '第一单元',
    section: '阅读',
    knowledgePoint: '诗歌鉴赏（现代诗）',
    difficulty: 'hard',
    description: '学习现代诗歌的意象、意境、情感'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '上册',
    chapter: '第一单元',
    section: '写作',
    knowledgePoint: '学会记录',
    difficulty: 'medium',
    description: '学习记录生活和思考'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '上册',
    chapter: '第二单元',
    section: '阅读',
    knowledgePoint: '散文阅读',
    difficulty: 'hard',
    description: '学习散文的语言、结构、主题'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '上册',
    chapter: '第二单元',
    section: '写作',
    knowledgePoint: '学会审题立意',
    difficulty: 'hard',
    description: '学习准确审题和深刻立意'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '上册',
    chapter: '第三单元',
    section: '阅读',
    knowledgePoint: '古代诗歌鉴赏',
    difficulty: 'hard',
    description: '学习古代诗歌的鉴赏方法'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '上册',
    chapter: '第三单元',
    section: '写作',
    knowledgePoint: '学会选材组材',
    difficulty: 'hard',
    description: '学习选择和组织写作材料'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '上册',
    chapter: '第四单元',
    section: '阅读',
    knowledgePoint: '文言文阅读',
    difficulty: 'hard',
    description: '学习文言文的实词、虚词、句式'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '上册',
    chapter: '第四单元',
    section: '写作',
    knowledgePoint: '学会叙事',
    difficulty: 'hard',
    description: '学习叙事的方法和技巧'
  },

  // 必修下册
  {
    subject: '语文',
    grade: '高一',
    semester: '下册',
    chapter: '第一单元',
    section: '阅读',
    knowledgePoint: '论述类文本阅读',
    difficulty: 'hard',
    description: '学习论述类文本的论点、论据、论证'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '下册',
    chapter: '第一单元',
    section: '写作',
    knowledgePoint: '学会论证',
    difficulty: 'hard',
    description: '学习议论文的论证方法'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '下册',
    chapter: '第二单元',
    section: '阅读',
    knowledgePoint: '实用类文本阅读',
    difficulty: 'hard',
    description: '学习新闻、报告、传记等实用文本'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '下册',
    chapter: '第二单元',
    section: '写作',
    knowledgePoint: '学会说明',
    difficulty: 'medium',
    description: '学习说明文的写作方法'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '下册',
    chapter: '第三单元',
    section: '阅读',
    knowledgePoint: '小说阅读',
    difficulty: 'hard',
    description: '深入学习小说的人物、情节、环境、主题'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '下册',
    chapter: '第三单元',
    section: '写作',
    knowledgePoint: '学会描写',
    difficulty: 'hard',
    description: '学习人物描写、景物描写、场面描写'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '下册',
    chapter: '第四单元',
    section: '阅读',
    knowledgePoint: '古代散文阅读',
    difficulty: 'hard',
    description: '学习古代散文的阅读和鉴赏'
  },
  {
    subject: '语文',
    grade: '高一',
    semester: '下册',
    chapter: '第四单元',
    section: '写作',
    knowledgePoint: '学会抒情',
    difficulty: 'hard',
    description: '学习直接抒情和间接抒情'
  },

  // 选择性必修上册
  {
    subject: '语文',
    grade: '高二',
    semester: '上册',
    chapter: '第一单元',
    section: '阅读',
    knowledgePoint: '现代诗歌鉴赏',
    difficulty: 'hard',
    description: '深入学习现代诗歌的艺术手法'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '上册',
    chapter: '第一单元',
    section: '写作',
    knowledgePoint: '学会议论',
    difficulty: 'hard',
    description: '提高议论文写作水平'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '上册',
    chapter: '第二单元',
    section: '阅读',
    knowledgePoint: '散文鉴赏',
    difficulty: 'hard',
    description: '学习散文的艺术特色'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '上册',
    chapter: '第二单元',
    section: '写作',
    knowledgePoint: '学会思辨',
    difficulty: 'hard',
    description: '培养思辨能力和批判性思维'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '上册',
    chapter: '第三单元',
    section: '阅读',
    knowledgePoint: '古代诗词鉴赏',
    difficulty: 'hard',
    description: '深入学习古代诗词的艺术手法'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '上册',
    chapter: '第三单元',
    section: '写作',
    knowledgePoint: '学会修改',
    difficulty: 'hard',
    description: '学习修改文章的方法'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '上册',
    chapter: '第四单元',
    section: '阅读',
    knowledgePoint: '文言文深度阅读',
    difficulty: 'hard',
    description: '深入学习文言文的翻译和鉴赏'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '上册',
    chapter: '第四单元',
    section: '写作',
    knowledgePoint: '学会点评',
    difficulty: 'hard',
    description: '学习评论性文章的写作'
  },

  // 选择性必修下册
  {
    subject: '语文',
    grade: '高二',
    semester: '下册',
    chapter: '第一单元',
    section: '阅读',
    knowledgePoint: '文学类文本综合阅读',
    difficulty: 'hard',
    description: '综合运用各种阅读方法'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '下册',
    chapter: '第一单元',
    section: '写作',
    knowledgePoint: '学会创新',
    difficulty: 'hard',
    description: '培养创新思维和表达'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '下册',
    chapter: '第二单元',
    section: '阅读',
    knowledgePoint: '论述类文本深度阅读',
    difficulty: 'hard',
    description: '深入分析论述类文本的逻辑'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '下册',
    chapter: '第二单元',
    section: '写作',
    knowledgePoint: '学会综合',
    difficulty: 'hard',
    description: '学习综合性写作'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '下册',
    chapter: '第三单元',
    section: '阅读',
    knowledgePoint: '实用类文本深度阅读',
    difficulty: 'hard',
    description: '深入学习实用类文本的特点'
  },
  {
    subject: '语文',
    grade: '高二',
    semester: '下册',
    chapter: '第三单元',
    section: '写作',
    knowledgePoint: '学会应用',
    difficulty: 'hard',
    description: '学习应用文的写作'
  },

  // 高三复习
  {
    subject: '语文',
    grade: '高三',
    semester: '上册',
    chapter: '专题复习',
    section: '阅读',
    knowledgePoint: '现代文阅读综合',
    difficulty: 'hard',
    description: '综合复习现代文阅读技巧'
  },
  {
    subject: '语文',
    grade: '高三',
    semester: '上册',
    chapter: '专题复习',
    section: '阅读',
    knowledgePoint: '古诗文阅读综合',
    difficulty: 'hard',
    description: '综合复习古诗文阅读技巧'
  },
  {
    subject: '语文',
    grade: '高三',
    semester: '上册',
    chapter: '专题复习',
    section: '写作',
    knowledgePoint: '作文审题立意',
    difficulty: 'hard',
    description: '强化作文审题立意训练'
  },
  {
    subject: '语文',
    grade: '高三',
    semester: '上册',
    chapter: '专题复习',
    section: '写作',
    knowledgePoint: '作文结构布局',
    difficulty: 'hard',
    description: '强化作文结构布局训练'
  },
  {
    subject: '语文',
    grade: '高三',
    semester: '上册',
    chapter: '专题复习',
    section: '写作',
    knowledgePoint: '作文语言表达',
    difficulty: 'hard',
    description: '强化作文语言表达训练'
  },
  {
    subject: '语文',
    grade: '高三',
    semester: '下册',
    chapter: '冲刺复习',
    section: '综合',
    knowledgePoint: '高考真题训练',
    difficulty: 'hard',
    description: '通过真题训练提高应试能力'
  },
  {
    subject: '语文',
    grade: '高三',
    semester: '下册',
    chapter: '冲刺复习',
    section: '综合',
    knowledgePoint: '答题技巧',
    difficulty: 'hard',
    description: '掌握各类题型的答题技巧'
  },
  {
    subject: '语文',
    grade: '高三',
    semester: '下册',
    chapter: '冲刺复习',
    section: '综合',
    knowledgePoint: '时间管理',
    difficulty: 'hard',
    description: '学习考试时间分配和管理'
  }
];

async function importChineseKnowledge() {
  console.log('开始导入语文学科知识点数据...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const kp of chineseKnowledgeData) {
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

importChineseKnowledge().catch(console.error);
