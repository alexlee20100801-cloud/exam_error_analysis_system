CREATE TABLE `ab_test_experiments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`experiment_name` varchar(200) NOT NULL,
	`experiment_description` text,
	`control_algorithm` varchar(100) NOT NULL,
	`treatment_algorithm` varchar(100) NOT NULL,
	`algorithm_config` json,
	`traffic_split_ratio` float NOT NULL DEFAULT 0.5,
	`target_user_segment` json,
	`status` enum('draft','running','paused','completed','archived') NOT NULL DEFAULT 'draft',
	`start_date` timestamp,
	`end_date` timestamp,
	`control_group_size` int NOT NULL DEFAULT 0,
	`treatment_group_size` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ab_test_experiments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ab_test_statistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`experiment_id` int NOT NULL,
	`metric_name` varchar(100) NOT NULL,
	`control_mean` float NOT NULL,
	`control_std_dev` float,
	`control_sample_size` int NOT NULL,
	`treatment_mean` float NOT NULL,
	`treatment_std_dev` float,
	`treatment_sample_size` int NOT NULL,
	`p_value` float,
	`confidence_interval` json,
	`is_significant` int NOT NULL DEFAULT 0,
	`effect_size` float,
	`recommendation` text,
	`calculated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ab_test_statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ab_test_user_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`experiment_id` int NOT NULL,
	`user_id` int NOT NULL,
	`group_type` enum('control','treatment') NOT NULL,
	`assigned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`user_features` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ab_test_user_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `batch_operation_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`operation_type` enum('batch_delete','batch_mark_mastered','batch_export','batch_update_difficulty','batch_add_tags','batch_update_subject','batch_update_grade') NOT NULL,
	`operation_description` text NOT NULL,
	`affected_count` int NOT NULL,
	`affected_ids` json NOT NULL,
	`before_snapshot` json,
	`after_snapshot` json,
	`change_details` json,
	`can_undo` int NOT NULL DEFAULT 1,
	`undo_status` enum('none','undone','redo') NOT NULL DEFAULT 'none',
	`undo_at` timestamp,
	`undo_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batch_operation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_point_hotness` (
	`id` int AUTO_INCREMENT NOT NULL,
	`knowledge_point_id` int NOT NULL,
	`knowledge_point_name` varchar(200) NOT NULL,
	`subject` varchar(50) NOT NULL,
	`school_level` enum('junior','senior') NOT NULL,
	`access_count` int NOT NULL DEFAULT 0,
	`analysis_count` int NOT NULL DEFAULT 0,
	`question_count` int NOT NULL DEFAULT 0,
	`hotness_score` float NOT NULL DEFAULT 0,
	`last_access_at` timestamp,
	`statistics_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_point_hotness_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_type_hotness` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject` varchar(50) NOT NULL,
	`school_level` enum('junior','senior') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`question_type_pattern` text NOT NULL,
	`occurrence_count` int NOT NULL DEFAULT 0,
	`analysis_count` int NOT NULL DEFAULT 0,
	`hotness_score` float NOT NULL DEFAULT 0,
	`statistics_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_type_hotness_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendation_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`experiment_id` int,
	`user_id` int NOT NULL,
	`recommendation_type` varchar(100) NOT NULL,
	`recommended_item_id` int NOT NULL,
	`recommendation_algorithm` varchar(100) NOT NULL,
	`recommendation_rank` int,
	`was_clicked` int NOT NULL DEFAULT 0,
	`was_used` int NOT NULL DEFAULT 0,
	`time_spent_seconds` int,
	`user_rating` int,
	`user_comment` text,
	`was_marked_mastered` int DEFAULT 0,
	`was_added_to_favorites` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `recommendation_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warmup_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_name` varchar(200) NOT NULL,
	`task_type` enum('knowledge_point','question_type','recommendation') NOT NULL,
	`target_config` json NOT NULL,
	`priority` int NOT NULL DEFAULT 5,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`progress` float NOT NULL DEFAULT 0,
	`cache_generated_count` int NOT NULL DEFAULT 0,
	`execution_time_ms` int,
	`error_message` text,
	`scheduled_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warmup_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `status_idx` ON `ab_test_experiments` (`status`);--> statement-breakpoint
CREATE INDEX `start_date_idx` ON `ab_test_experiments` (`start_date`);--> statement-breakpoint
CREATE INDEX `experiment_metric_idx` ON `ab_test_statistics` (`experiment_id`,`metric_name`);--> statement-breakpoint
CREATE INDEX `experiment_user_idx` ON `ab_test_user_groups` (`experiment_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `ab_test_user_groups` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `batch_operation_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `operation_type_idx` ON `batch_operation_history` (`operation_type`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `batch_operation_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `undo_status_idx` ON `batch_operation_history` (`undo_status`);--> statement-breakpoint
CREATE INDEX `knowledge_point_idx` ON `knowledge_point_hotness` (`knowledge_point_id`);--> statement-breakpoint
CREATE INDEX `hotness_score_idx` ON `knowledge_point_hotness` (`hotness_score`);--> statement-breakpoint
CREATE INDEX `subject_level_idx` ON `knowledge_point_hotness` (`subject`,`school_level`);--> statement-breakpoint
CREATE INDEX `subject_level_difficulty_idx` ON `question_type_hotness` (`subject`,`school_level`,`difficulty`);--> statement-breakpoint
CREATE INDEX `hotness_score_idx` ON `question_type_hotness` (`hotness_score`);--> statement-breakpoint
CREATE INDEX `experiment_user_idx` ON `recommendation_feedback` (`experiment_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `recommendation_feedback` (`user_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `recommendation_feedback` (`created_at`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `warmup_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `scheduled_at_idx` ON `warmup_tasks` (`scheduled_at`);