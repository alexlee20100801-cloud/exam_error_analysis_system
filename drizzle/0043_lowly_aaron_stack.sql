CREATE TABLE `class_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`class_id` int NOT NULL,
	`report_type` enum('weekly','monthly','semester') NOT NULL,
	`report_period` varchar(50) NOT NULL,
	`total_students` int NOT NULL DEFAULT 0,
	`active_students` int NOT NULL DEFAULT 0,
	`total_error_questions` int NOT NULL DEFAULT 0,
	`average_mastery_rate` int NOT NULL DEFAULT 0,
	`weak_knowledge_points` text,
	`student_rankings` text,
	`generated_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `class_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parent_view_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parent_id` int NOT NULL,
	`student_id` int NOT NULL,
	`view_type` enum('dashboard','error_question','report','progress') NOT NULL,
	`viewed_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `parent_view_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`class_id` int NOT NULL,
	`joined_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`left_at` timestamp,
	`is_active` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `student_classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teacher_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacher_id` int NOT NULL,
	`class_name` varchar(100) NOT NULL,
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3') NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography'),
	`school_year` varchar(20),
	`semester` enum('first','second'),
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacher_classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_class_id` ON `class_reports` (`class_id`);--> statement-breakpoint
CREATE INDEX `idx_report_period` ON `class_reports` (`report_period`);--> statement-breakpoint
CREATE INDEX `idx_parent_student` ON `parent_view_logs` (`parent_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_viewed_at` ON `parent_view_logs` (`viewed_at`);--> statement-breakpoint
CREATE INDEX `idx_student_id` ON `student_classes` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_class_id` ON `student_classes` (`class_id`);--> statement-breakpoint
CREATE INDEX `idx_teacher_id` ON `teacher_classes` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `idx_grade_subject` ON `teacher_classes` (`grade`,`subject`);