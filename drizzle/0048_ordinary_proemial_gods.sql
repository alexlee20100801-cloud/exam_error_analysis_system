CREATE TABLE `learning_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`report_type` enum('weekly','monthly') NOT NULL,
	`period_start` timestamp NOT NULL,
	`period_end` timestamp NOT NULL,
	`total_study_time` int NOT NULL DEFAULT 0,
	`new_questions_count` int NOT NULL DEFAULT 0,
	`reviewed_questions_count` int NOT NULL DEFAULT 0,
	`mastered_questions_count` int NOT NULL DEFAULT 0,
	`subject_mastery` json NOT NULL,
	`weak_knowledge_points` json NOT NULL,
	`improvement_suggestions` text,
	`progress_score` decimal(5,2),
	`status` enum('generating','completed','failed') NOT NULL DEFAULT 'generating',
	`is_notified` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_reminder_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`is_enabled` tinyint NOT NULL DEFAULT 1,
	`reminder_time` varchar(5) NOT NULL DEFAULT '20:00',
	`reminder_method` enum('system','email','sms') NOT NULL DEFAULT 'system',
	`max_daily_reminders` int NOT NULL DEFAULT 10,
	`priority_subjects` json,
	`remind_on_weekends` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_reminder_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`duration` int NOT NULL,
	`activity_type` enum('review','practice','analysis','upload') NOT NULL,
	`error_question_id` int,
	`started_at` timestamp NOT NULL,
	`ended_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `study_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subject_mastery_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`mastery_rate` decimal(5,2) NOT NULL,
	`total_questions` int NOT NULL DEFAULT 0,
	`mastered_questions` int NOT NULL DEFAULT 0,
	`pending_questions` int NOT NULL DEFAULT 0,
	`snapshot_date` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `subject_mastery_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_period` ON `learning_reports` (`user_id`,`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `idx_user_type` ON `learning_reports` (`user_id`,`report_type`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `learning_reports` (`status`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `review_reminder_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_subject` ON `study_sessions` (`user_id`,`subject`);--> statement-breakpoint
CREATE INDEX `idx_user_started_at` ON `study_sessions` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_error_question` ON `study_sessions` (`error_question_id`);--> statement-breakpoint
CREATE INDEX `idx_user_subject_date` ON `subject_mastery_snapshots` (`user_id`,`subject`,`snapshot_date`);