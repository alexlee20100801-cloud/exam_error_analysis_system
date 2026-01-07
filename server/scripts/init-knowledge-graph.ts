/**
 * 知识图谱数据初始化脚本
 * 导入深圳初高中各学科教材目录和知识点数据
 */

import { db } from "../db";
import { knowledgePoints, knowledgePointRelations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// 深圳初高中数学知识点结构
const mathKnowledgeData = {
  subject: 'math' as const,
  chapters: [
    {
      name: '有理数',
      grade: 'junior1' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '有理数的概念',
          points: ['正数与负数', '有理数的分类', '数轴', '相反数', '绝对值']
        },
        {
          name: '有理数的运算',
          points: ['有理数加法', '有理数减法', '有理数乘法', '有理数除法', '有理数混合运算']
        }
      ]
    },
    {
      name: '整式的加减',
      grade: 'junior1' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '整式',
          points: ['单项式', '多项式', '整式的概念']
        },
        {
          name: '整式的加减',
          points: ['合并同类项', '去括号', '整式加减运算']
        }
      ]
    },
    {
      name: '一元一次方程',
      grade: 'junior1' as const,
      semester: 'second' as const,
      sections: [
        {
          name: '方程的概念',
          points: ['方程', '方程的解', '等式的性质']
        },
        {
          name: '解一元一次方程',
          points: ['移项', '合并同类项解方程', '去括号解方程', '去分母解方程']
        },
        {
          name: '实际问题与一元一次方程',
          points: ['行程问题', '工程问题', '配套问题', '盈亏问题']
        }
      ]
    },
    {
      name: '二次函数',
      grade: 'junior3' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '二次函数的概念',
          points: ['二次函数的定义', '二次函数的图像', '二次函数的性质']
        },
        {
          name: '二次函数的应用',
          points: ['最值问题', '抛物线与坐标轴交点', '二次函数与一元二次方程']
        }
      ]
    },
    {
      name: '集合与函数',
      grade: 'senior1' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '集合',
          points: ['集合的概念', '集合的表示', '集合间的基本关系', '集合的运算']
        },
        {
          name: '函数及其表示',
          points: ['函数的概念', '函数的表示法', '函数的定义域', '函数的值域']
        },
        {
          name: '函数的基本性质',
          points: ['单调性', '奇偶性', '周期性']
        }
      ]
    },
    {
      name: '导数及其应用',
      grade: 'senior2' as const,
      semester: 'second' as const,
      sections: [
        {
          name: '导数的概念',
          points: ['导数的定义', '导数的几何意义', '导数的运算']
        },
        {
          name: '导数的应用',
          points: ['单调性', '极值', '最值', '切线方程']
        }
      ]
    }
  ]
};

// 深圳初高中物理知识点结构
const physicsKnowledgeData = {
  subject: 'physics' as const,
  chapters: [
    {
      name: '声现象',
      grade: 'junior2' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '声音的产生与传播',
          points: ['声音的产生', '声音的传播', '声速']
        },
        {
          name: '声音的特性',
          points: ['音调', '响度', '音色']
        }
      ]
    },
    {
      name: '光现象',
      grade: 'junior2' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '光的传播',
          points: ['光源', '光的直线传播', '光速']
        },
        {
          name: '光的反射',
          points: ['光的反射定律', '镜面反射', '漫反射', '平面镜成像']
        },
        {
          name: '光的折射',
          points: ['光的折射定律', '透镜', '凸透镜成像']
        }
      ]
    },
    {
      name: '力学基础',
      grade: 'junior2' as const,
      semester: 'second' as const,
      sections: [
        {
          name: '力',
          points: ['力的概念', '力的三要素', '力的示意图', '重力', '弹力', '摩擦力']
        },
        {
          name: '运动和力',
          points: ['牛顿第一定律', '惯性', '二力平衡']
        }
      ]
    },
    {
      name: '运动学',
      grade: 'senior1' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '直线运动',
          points: ['位移', '速度', '加速度', '匀变速直线运动']
        },
        {
          name: '运动图像',
          points: ['位移-时间图像', '速度-时间图像']
        }
      ]
    },
    {
      name: '牛顿运动定律',
      grade: 'senior1' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '牛顿三定律',
          points: ['牛顿第一定律', '牛顿第二定律', '牛顿第三定律']
        },
        {
          name: '力学应用',
          points: ['超重与失重', '连接体问题', '临界问题']
        }
      ]
    }
  ]
};

// 深圳初高中化学知识点结构
const chemistryKnowledgeData = {
  subject: 'chemistry' as const,
  chapters: [
    {
      name: '物质的变化和性质',
      grade: 'junior3' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '物质的变化',
          points: ['物理变化', '化学变化', '化学反应的特征']
        },
        {
          name: '物质的性质',
          points: ['物理性质', '化学性质']
        }
      ]
    },
    {
      name: '空气',
      grade: 'junior3' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '空气的组成',
          points: ['空气的成分', '氧气的性质', '氧气的用途']
        },
        {
          name: '氧气的制取',
          points: ['实验室制氧气', '工业制氧气']
        }
      ]
    },
    {
      name: '水',
      grade: 'junior3' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '水的组成',
          points: ['水的电解', '氢气的性质']
        },
        {
          name: '水的净化',
          points: ['过滤', '吸附', '蒸馏', '硬水软化']
        }
      ]
    },
    {
      name: '原子结构',
      grade: 'senior1' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '原子的构成',
          points: ['质子', '中子', '电子', '原子核']
        },
        {
          name: '元素周期表',
          points: ['周期', '族', '元素周期律']
        }
      ]
    },
    {
      name: '化学反应原理',
      grade: 'senior2' as const,
      semester: 'first' as const,
      sections: [
        {
          name: '化学反应与能量',
          points: ['放热反应', '吸热反应', '反应热']
        },
        {
          name: '化学平衡',
          points: ['化学平衡状态', '平衡移动', '平衡常数']
        }
      ]
    }
  ]
};

// 插入章节和知识点
async function insertChapterData(
  subject: string,
  chapterName: string,
  grade: string,
  semester: string,
  sections: any[]
) {
  // 插入章节
  const [chapterResult] = await db.insert(knowledgePoints).values({
    name: chapterName,
    subject,
    grade,
    semester,
    level: 'chapter',
    parentId: null
  });
  
  const chapterId = chapterResult.insertId;
  console.log(`  ✓ 插入章节: ${chapterName} (ID: ${chapterId})`);
  
  // 插入小节和知识点
  for (const section of sections) {
    const [sectionResult] = await db.insert(knowledgePoints).values({
      name: section.name,
      subject,
      grade,
      semester,
      level: 'section',
      parentId: chapterId
    });
    
    const sectionId = sectionResult.insertId;
    console.log(`    ✓ 插入小节: ${section.name} (ID: ${sectionId})`);
    
    // 插入知识点
    for (const pointName of section.points) {
      const [pointResult] = await db.insert(knowledgePoints).values({
        name: pointName,
        subject,
        grade,
        semester,
        level: 'point',
        parentId: sectionId
      });
      
      console.log(`      ✓ 插入知识点: ${pointName} (ID: ${pointResult.insertId})`);
    }
  }
}

// 主函数
async function main() {
  console.log('开始初始化知识图谱数据...\n');
  
  try {
    // 检查是否已有数据
    const existingData = await db.select().from(knowledgePoints).limit(1);
    if (existingData.length > 0) {
      console.log('⚠️  知识图谱数据已存在,跳过初始化');
      console.log('如需重新初始化,请先清空 knowledge_points 表\n');
      return;
    }
    
    // 1. 导入数学知识点
    console.log('📚 导入数学知识点...');
    for (const chapter of mathKnowledgeData.chapters) {
      await insertChapterData(
        mathKnowledgeData.subject,
        chapter.name,
        chapter.grade,
        chapter.semester,
        chapter.sections
      );
    }
    console.log('✅ 数学知识点导入完成\n');
    
    // 2. 导入物理知识点
    console.log('⚗️  导入物理知识点...');
    for (const chapter of physicsKnowledgeData.chapters) {
      await insertChapterData(
        physicsKnowledgeData.subject,
        chapter.name,
        chapter.grade,
        chapter.semester,
        chapter.sections
      );
    }
    console.log('✅ 物理知识点导入完成\n');
    
    // 3. 导入化学知识点
    console.log('🧪 导入化学知识点...');
    for (const chapter of chemistryKnowledgeData.chapters) {
      await insertChapterData(
        chemistryKnowledgeData.subject,
        chapter.name,
        chapter.grade,
        chapter.semester,
        chapter.sections
      );
    }
    console.log('✅ 化学知识点导入完成\n');
    
    // 统计信息
    const totalPoints = await db.select().from(knowledgePoints);
    const chapters = totalPoints.filter(p => p.level === 'chapter');
    const sections = totalPoints.filter(p => p.level === 'section');
    const points = totalPoints.filter(p => p.level === 'point');
    
    console.log('📊 导入统计:');
    console.log(`  - 章节: ${chapters.length} 个`);
    console.log(`  - 小节: ${sections.length} 个`);
    console.log(`  - 知识点: ${points.length} 个`);
    console.log(`  - 总计: ${totalPoints.length} 条记录\n`);
    
    console.log('🎉 知识图谱数据初始化完成!');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 执行
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export { main as initKnowledgeGraph };
