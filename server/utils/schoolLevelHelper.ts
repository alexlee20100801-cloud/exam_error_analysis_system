/**
 * 板块（初中/高中）辅助函数
 */

import type { SchoolLevel } from "../../shared/subjects";

type Grade = "junior1" | "junior2" | "junior3" | "senior1" | "senior2" | "senior3";

/**
 * 根据年级推断板块
 */
export function getSchoolLevelFromGrade(grade: Grade): SchoolLevel {
  if (grade.startsWith("junior")) {
    return "junior";
  }
  return "senior";
}

/**
 * 验证年级和板块是否匹配
 */
export function isGradeMatchLevel(grade: Grade, level: SchoolLevel): boolean {
  return getSchoolLevelFromGrade(grade) === level;
}
