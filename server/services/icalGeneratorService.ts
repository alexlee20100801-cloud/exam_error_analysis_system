import type { LearningAdvice } from "./aiLearningAdviceService";

/**
 * iCal日历生成服务
 * 将AI复习计划转换为iCal格式，支持导出到各种日历应用
 */

/**
 * 生成iCal格式的日历文件内容
 */
export function generateICalFromReviewPlan(
  reviewPlan: LearningAdvice["reviewPlan"],
  userName?: string
): string {
  const now = new Date();
  const events = reviewPlan.map((plan, index) => {
    const eventDate = parseSuggestedTime(plan.suggestedTime, now);
    return generateICalEvent({
      title: `复习：${plan.subject}${plan.knowledgePoint ? ` - ${plan.knowledgePoint}` : ""}`,
      description: plan.reason,
      startDate: eventDate,
      duration: 45, // 默认45分钟
      priority: plan.priority,
      location: "",
    });
  });

  return generateICalFile(events, userName);
}

/**
 * 解析建议时间文本，返回具体日期
 */
function parseSuggestedTime(suggestedTime: string, baseDate: Date): Date {
  const date = new Date(baseDate);
  date.setHours(19, 0, 0, 0); // 默认晚上7点

  const timeText = suggestedTime.toLowerCase();

  if (timeText.includes("今天") || timeText.includes("today")) {
    // 今天
    return date;
  } else if (timeText.includes("明天") || timeText.includes("tomorrow")) {
    // 明天
    date.setDate(date.getDate() + 1);
    return date;
  } else if (timeText.includes("后天")) {
    // 后天
    date.setDate(date.getDate() + 2);
    return date;
  } else if (timeText.includes("本周") || timeText.includes("this week")) {
    // 本周内（3天后）
    date.setDate(date.getDate() + 3);
    return date;
  } else if (timeText.includes("下周") || timeText.includes("next week")) {
    // 下周（7天后）
    date.setDate(date.getDate() + 7);
    return date;
  } else if (timeText.includes("本月") || timeText.includes("this month")) {
    // 本月内（5天后）
    date.setDate(date.getDate() + 5);
    return date;
  } else {
    // 默认3天后
    date.setDate(date.getDate() + 3);
    return date;
  }
}

/**
 * 日历事件接口
 */
interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  duration: number; // 分钟
  priority: number;
  location?: string;
}

/**
 * 生成单个iCal事件
 */
function generateICalEvent(event: CalendarEvent): string {
  const startDate = formatICalDate(event.startDate);
  const endDate = new Date(event.startDate.getTime() + event.duration * 60000);
  const endDateStr = formatICalDate(endDate);
  const now = formatICalDate(new Date());
  
  // 生成唯一ID
  const uid = `${startDate}-${Math.random().toString(36).substring(7)}@manus.im`;

  // 设置提醒（提前30分钟）
  const alarm = `BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:${escapeICalText(event.title)}
END:VALARM`;

  return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${startDate}
DTEND:${endDateStr}
SUMMARY:${escapeICalText(event.title)}
DESCRIPTION:${escapeICalText(event.description)}
PRIORITY:${event.priority}
STATUS:CONFIRMED
TRANSP:OPAQUE
${alarm}
END:VEVENT`;
}

/**
 * 生成完整的iCal文件
 */
function generateICalFile(events: string[], userName?: string): string {
  const header = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Manus//错题分析学习系统//CN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeICalText(userName ? `${userName}的复习计划` : "AI复习计划")}
X-WR-TIMEZONE:Asia/Shanghai
X-WR-CALDESC:基于AI分析生成的个性化复习计划`;

  const footer = `END:VCALENDAR`;

  return `${header}\n${events.join("\n")}\n${footer}`;
}

/**
 * 格式化日期为iCal格式 (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * 转义iCal文本中的特殊字符
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/**
 * 生成文件名
 */
export function generateICalFileName(userName?: string): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const name = userName ? `${userName}_` : "";
  return `${name}复习计划_${dateStr}.ics`;
}
