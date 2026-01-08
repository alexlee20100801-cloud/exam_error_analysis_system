CREATE TABLE `crawl_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`website_url` varchar(500) NOT NULL,
	`source_type` enum('static_web','dynamic_web','api','file') NOT NULL,
	`url_template` text,
	`selector_config` json,
	`pagination_config` json,
	`auth_config` json,
	`use_proxy` tinyint NOT NULL DEFAULT 0,
	`request_delay` int NOT NULL DEFAULT 1000,
	`user_agent_rotation` tinyint NOT NULL DEFAULT 1,
	`content_extractors` json,
	`image_download` tinyint NOT NULL DEFAULT 1,
	`video_extraction` tinyint NOT NULL DEFAULT 0,
	`priority` int NOT NULL DEFAULT 5,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`schedule_time` varchar(50),
	`total_crawled` int NOT NULL DEFAULT 0,
	`success_count` int NOT NULL DEFAULT 0,
	`failure_count` int NOT NULL DEFAULT 0,
	`last_crawled_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crawl_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crawl_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_id` int NOT NULL,
	`task_type` enum('scheduled','manual','retry') NOT NULL,
	`status` enum('pending','running','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`started_at` timestamp,
	`completed_at` timestamp,
	`duration` int,
	`items_processed` int NOT NULL DEFAULT 0,
	`items_succeeded` int NOT NULL DEFAULT 0,
	`items_failed` int NOT NULL DEFAULT 0,
	`items_duplicated` int NOT NULL DEFAULT 0,
	`error_message` text,
	`error_stack` text,
	`log_file` varchar(500),
	`result_summary` json,
	`retry_count` int NOT NULL DEFAULT 0,
	`max_retries` int NOT NULL DEFAULT 3,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crawl_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_quality` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`has_title` tinyint NOT NULL DEFAULT 0,
	`has_content` tinyint NOT NULL DEFAULT 0,
	`has_answer` tinyint NOT NULL DEFAULT 0,
	`has_explanation` tinyint NOT NULL DEFAULT 0,
	`has_images` tinyint NOT NULL DEFAULT 0,
	`completeness_score` decimal(5,2) NOT NULL,
	`answer_reasonable` tinyint NOT NULL DEFAULT 1,
	`explanation_correct` tinyint NOT NULL DEFAULT 1,
	`no_typos` tinyint NOT NULL DEFAULT 1,
	`accuracy_score` decimal(5,2) NOT NULL,
	`estimated_difficulty` enum('easy','medium','hard'),
	`difficulty_confidence` decimal(5,2),
	`overall_score` decimal(5,2) NOT NULL,
	`scored_by` enum('ai','manual','hybrid') NOT NULL DEFAULT 'ai',
	`scorer_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_quality_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`tag_type` enum('region','grade','subject','knowledge_point','question_type','difficulty','source') NOT NULL,
	`tag_value` varchar(255) NOT NULL,
	`is_ai_generated` tinyint NOT NULL DEFAULT 1,
	`confidence` decimal(5,2),
	`is_verified` tinyint NOT NULL DEFAULT 0,
	`verified_by` int,
	`verified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `question_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_question_tag` UNIQUE(`question_id`,`tag_type`,`tag_value`)
);
--> statement-breakpoint
CREATE TABLE `questions_db` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`content_images` json,
	`options` json,
	`answer` text NOT NULL,
	`explanation` text,
	`explanation_images` json,
	`region` varchar(100),
	`school_level` enum('junior','senior') NOT NULL,
	`grade` enum('grade7','grade8','grade9','grade10','grade11','grade12') NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`knowledge_points` json,
	`question_type` enum('choice','multiple_choice','blank','short_answer','calculation','essay','proof') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`difficulty_score` decimal(3,2),
	`source_type` enum('exam','exercise','competition','mock') NOT NULL,
	`source_name` varchar(255),
	`source_school` varchar(255),
	`source_year` int,
	`source_url` varchar(500),
	`quality_score` decimal(5,2),
	`completeness_score` decimal(5,2),
	`accuracy_score` decimal(5,2),
	`verification_status` enum('pending','verified','rejected','needs_review') NOT NULL DEFAULT 'pending',
	`verified_by` int,
	`verified_at` timestamp,
	`ai_classified` tinyint NOT NULL DEFAULT 0,
	`ai_confidence` decimal(5,2),
	`ai_classified_at` timestamp,
	`view_count` int NOT NULL DEFAULT 0,
	`usage_count` int NOT NULL DEFAULT 0,
	`favorite_count` int NOT NULL DEFAULT 0,
	`content_hash` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_db_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_explanations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`video_url` varchar(500) NOT NULL,
	`thumbnail_url` varchar(500),
	`duration` int,
	`resolution` varchar(20),
	`file_size` int,
	`teacher_name` varchar(100),
	`teacher_title` varchar(100),
	`teacher_school` varchar(255),
	`description` text,
	`knowledge_points` json,
	`segments` json,
	`quality_score` decimal(5,2),
	`view_count` int NOT NULL DEFAULT 0,
	`like_count` int NOT NULL DEFAULT 0,
	`is_available` tinyint NOT NULL DEFAULT 1,
	`last_checked_at` timestamp,
	`source_url` varchar(500),
	`source_platform` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_explanations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_is_active` ON `crawl_sources` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_priority` ON `crawl_sources` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_source_type` ON `crawl_sources` (`source_type`);--> statement-breakpoint
CREATE INDEX `idx_source_id` ON `crawl_tasks` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `crawl_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_task_type` ON `crawl_tasks` (`task_type`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `crawl_tasks` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_question_id` ON `question_quality` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_overall_score` ON `question_quality` (`overall_score`);--> statement-breakpoint
CREATE INDEX `idx_question_id` ON `question_tags` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_tag_type` ON `question_tags` (`tag_type`);--> statement-breakpoint
CREATE INDEX `idx_tag_value` ON `question_tags` (`tag_value`);--> statement-breakpoint
CREATE INDEX `idx_region_grade_subject` ON `questions_db` (`region`,`grade`,`subject`);--> statement-breakpoint
CREATE INDEX `idx_question_type` ON `questions_db` (`question_type`);--> statement-breakpoint
CREATE INDEX `idx_difficulty` ON `questions_db` (`difficulty`);--> statement-breakpoint
CREATE INDEX `idx_source_type` ON `questions_db` (`source_type`);--> statement-breakpoint
CREATE INDEX `idx_quality_score` ON `questions_db` (`quality_score`);--> statement-breakpoint
CREATE INDEX `idx_verification_status` ON `questions_db` (`verification_status`);--> statement-breakpoint
CREATE INDEX `idx_content_hash` ON `questions_db` (`content_hash`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `questions_db` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_question_id` ON `video_explanations` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_is_available` ON `video_explanations` (`is_available`);--> statement-breakpoint
CREATE INDEX `idx_quality_score` ON `video_explanations` (`quality_score`);