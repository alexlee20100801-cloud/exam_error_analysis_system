ALTER TABLE `error_questions` ADD `semester` enum('first','second');--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `semester` enum('first','second');--> statement-breakpoint
ALTER TABLE `question_bank` ADD `semester` enum('first','second');--> statement-breakpoint
ALTER TABLE `real_exam_questions` ADD `semester` enum('first','second');