import { describe, it, expect } from "vitest";
import { generateICalFromReviewPlan, generateICalFileName } from "./services/icalGeneratorService";
import type { LearningAdvice } from "./services/aiLearningAdviceService";

describe("iCal日历生成功能测试", () => {
  const mockReviewPlan: LearningAdvice["reviewPlan"] = [
    {
      subject: "数学",
      knowledgePoint: "二次函数",
      reason: "该知识点错题较多，需要重点复习",
      suggestedTime: "今天",
      priority: 1,
    },
    {
      subject: "物理",
      knowledgePoint: "力学",
      reason: "难度较高，建议加强练习",
      suggestedTime: "明天",
      priority: 2,
    },
    {
      subject: "英语",
      knowledgePoint: "语法",
      reason: "基础薄弱，需要巩固",
      suggestedTime: "本周内",
      priority: 3,
    },
  ];

  it("应该成功生成iCal格式内容", () => {
    const icalContent = generateICalFromReviewPlan(mockReviewPlan);

    expect(icalContent).toBeDefined();
    expect(typeof icalContent).toBe("string");
    expect(icalContent.length).toBeGreaterThan(0);
  });

  it("应该包含iCal标准头部", () => {
    const icalContent = generateICalFromReviewPlan(mockReviewPlan);

    expect(icalContent).toContain("BEGIN:VCALENDAR");
    expect(icalContent).toContain("VERSION:2.0");
    expect(icalContent).toContain("PRODID:-//Manus//错题分析学习系统//CN");
    expect(icalContent).toContain("END:VCALENDAR");
  });

  it("应该为每个复习计划生成事件", () => {
    const icalContent = generateICalFromReviewPlan(mockReviewPlan);

    // 应该包含3个事件
    const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(3);

    // 验证事件标题
    expect(icalContent).toContain("复习：数学 - 二次函数");
    expect(icalContent).toContain("复习：物理 - 力学");
    expect(icalContent).toContain("复习：英语 - 语法");
  });

  it("应该为每个事件添加提醒", () => {
    const icalContent = generateICalFromReviewPlan(mockReviewPlan);

    // 应该包含3个提醒
    const alarmCount = (icalContent.match(/BEGIN:VALARM/g) || []).length;
    expect(alarmCount).toBe(3);

    // 验证提醒时间（提前30分钟）
    expect(icalContent).toContain("TRIGGER:-PT30M");
  });

  it("应该正确设置事件优先级", () => {
    const icalContent = generateICalFromReviewPlan(mockReviewPlan);

    expect(icalContent).toContain("PRIORITY:1");
    expect(icalContent).toContain("PRIORITY:2");
    expect(icalContent).toContain("PRIORITY:3");
  });

  it("应该包含事件描述", () => {
    const icalContent = generateICalFromReviewPlan(mockReviewPlan);

    expect(icalContent).toContain("该知识点错题较多");
    expect(icalContent).toContain("难度较高");
    expect(icalContent).toContain("基础薄弱");
  });

  it("应该正确转义特殊字符", () => {
    const specialPlan: LearningAdvice["reviewPlan"] = [
      {
        subject: "数学;测试",
        knowledgePoint: "函数,方程",
        reason: "需要\\复习\n多行文本",
        suggestedTime: "今天",
        priority: 1,
      },
    ];

    const icalContent = generateICalFromReviewPlan(specialPlan);

    // 验证特殊字符被正确转义
    expect(icalContent).toContain("\\;");
    expect(icalContent).toContain("\\,");
    expect(icalContent).toContain("\\\\");
    expect(icalContent).toContain("\\n");
  });

  it("应该生成正确的文件名", () => {
    const fileName1 = generateICalFileName();
    expect(fileName1).toMatch(/^复习计划_\d{8}\.ics$/);

    const fileName2 = generateICalFileName("张三");
    expect(fileName2).toMatch(/^张三_复习计划_\d{8}\.ics$/);
  });

  it("应该处理空复习计划", () => {
    const emptyPlan: LearningAdvice["reviewPlan"] = [];
    const icalContent = generateICalFromReviewPlan(emptyPlan);

    expect(icalContent).toBeDefined();
    expect(icalContent).toContain("BEGIN:VCALENDAR");
    expect(icalContent).toContain("END:VCALENDAR");

    // 不应该包含任何事件
    const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(0);
  });

  it("应该正确解析不同的时间描述", () => {
    const timePlan: LearningAdvice["reviewPlan"] = [
      { subject: "测试1", reason: "测试", suggestedTime: "今天", priority: 1 },
      { subject: "测试2", reason: "测试", suggestedTime: "明天", priority: 2 },
      { subject: "测试3", reason: "测试", suggestedTime: "后天", priority: 3 },
      { subject: "测试4", reason: "测试", suggestedTime: "本周内", priority: 4 },
      { subject: "测试5", reason: "测试", suggestedTime: "下周", priority: 5 },
    ];

    const icalContent = generateICalFromReviewPlan(timePlan);

    // 应该包含5个事件
    const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(5);

    // 每个事件都应该有开始和结束时间
    expect(icalContent.match(/DTSTART:/g)?.length).toBe(5);
    expect(icalContent.match(/DTEND:/g)?.length).toBe(5);
  });

  it("应该设置正确的事件时长（45分钟）", () => {
    const singlePlan: LearningAdvice["reviewPlan"] = [
      {
        subject: "数学",
        reason: "测试",
        suggestedTime: "今天",
        priority: 1,
      },
    ];

    const icalContent = generateICalFromReviewPlan(singlePlan);

    // 提取DTSTART和DTEND
    const dtstartMatch = icalContent.match(/DTSTART:(\d{8}T\d{6})/);
    const dtendMatch = icalContent.match(/DTEND:(\d{8}T\d{6})/);

    expect(dtstartMatch).toBeTruthy();
    expect(dtendMatch).toBeTruthy();

    if (dtstartMatch && dtendMatch) {
      const startTime = dtstartMatch[1];
      const endTime = dtendMatch[1];

      // 解析时间
      const startHour = parseInt(startTime.substring(9, 11));
      const startMin = parseInt(startTime.substring(11, 13));
      const endHour = parseInt(endTime.substring(9, 11));
      const endMin = parseInt(endTime.substring(11, 13));

      // 计算时长（分钟）
      const duration = (endHour - startHour) * 60 + (endMin - startMin);
      expect(duration).toBe(45);
    }
  });
});
