CREATE TABLE `account_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`login_account` varchar(320) NOT NULL,
	`initial_password` varchar(255) NOT NULL,
	`password_changed` tinyint NOT NULL DEFAULT 0,
	`delivery_method` enum('email','sms') NOT NULL,
	`delivery_status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ai_annotation_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`annotation_id` int NOT NULL,
	`image_url` varchar(500) NOT NULL,
	`chart_type` varchar(100),
	`rating` int NOT NULL,
	`feedback_type` enum('accurate','partially_accurate','inaccurate','missing_features') NOT NULL,
	`improvement_suggestion` text,
	`ai_annotations` json,
	`user_corrected_annotations` json,
	`confidence` decimal(5,2),
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ai_generated_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_id` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`answer` text NOT NULL,
	`explanation` text,
	`question_type` enum('choice','blank','short_answer','calculation','essay') NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('grade7','grade8','grade9','grade10','grade11','grade12') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`knowledge_point_ids` json,
	`generation_method` enum('ai_inspired','ai_similar','ai_original') NOT NULL,
	`originality_score` decimal(5,2),
	`quality_score` decimal(5,2),
	`review_status` enum('pending','approved','rejected','needs_revision') NOT NULL DEFAULT 'pending',
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`review_notes` text,
	`is_public` tinyint NOT NULL DEFAULT 0,
	`usage_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ai_question_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`question_id` int NOT NULL,
	`folder_id` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `annotation_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shared_annotation_id` int NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`parent_comment_id` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `annotation_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shared_annotation_id` int NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `annotation_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('coordinate_system','function_graph','geometry','physics_experiment','chemistry_apparatus','data_chart','custom') NOT NULL,
	`description` text,
	`thumbnail_url` varchar(500),
	`annotations` json NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`is_public` tinyint NOT NULL DEFAULT 1,
	`created_by` varchar(255) NOT NULL,
	`usage_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`item_type` enum('error_question','practice_pool','question_bank','real_exam') NOT NULL,
	`item_id` int NOT NULL,
	`image_url` varchar(500) NOT NULL,
	`annotation_type` enum('marker','arrow','text','highlight','rectangle','circle') NOT NULL,
	`annotation_data` json,
	`color` varchar(50) DEFAULT '#FF0000',
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `chart_annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`error_question_id` int NOT NULL,
	`image_url` varchar(500) NOT NULL,
	`annotations` json,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `chart_data_extractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`error_question_id` int NOT NULL,
	`image_url` varchar(500) NOT NULL,
	`extracted_data` json,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `chart_type_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chart_type` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('math_function','geometry','physics','chemistry','data_visualization') NOT NULL,
	`description` text,
	`feature_patterns` json,
	`recognition_prompt` text,
	`accuracy_rate` decimal(5,2) DEFAULT '0',
	`feedback_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `collection_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`schools` json NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('grade7','grade8','grade9','grade10','grade11','grade12') NOT NULL,
	`exam_type` varchar(100),
	`year` int,
	`semester` enum('first','second'),
	`target_count` int NOT NULL,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`generated_question_ids` json,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`completed_at` timestamp
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_type` varchar(100) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`subject` varchar(500) NOT NULL,
	`html_content` text NOT NULL,
	`available_variables` json,
	`is_default` tinyint NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`last_modified_by` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `export_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_default` tinyint NOT NULL DEFAULT 0,
	`is_public` tinyint NOT NULL DEFAULT 0,
	`logo_url` varchar(500),
	`logo_position` enum('top-left','top-center','top-right') DEFAULT 'top-left',
	`logo_width` int DEFAULT 100,
	`header_text` varchar(500),
	`header_align` enum('left','center','right') DEFAULT 'center',
	`header_font_size` int DEFAULT 14,
	`footer_text` varchar(500),
	`footer_align` enum('left','center','right') DEFAULT 'center',
	`footer_font_size` int DEFAULT 12,
	`show_page_number` tinyint NOT NULL DEFAULT 1,
	`font_size` int DEFAULT 12,
	`line_spacing` int DEFAULT 150,
	`margin_top` int DEFAULT 20,
	`margin_bottom` int DEFAULT 20,
	`margin_left` int DEFAULT 20,
	`margin_right` int DEFAULT 20,
	`show_question_number` tinyint NOT NULL DEFAULT 1,
	`show_difficulty` tinyint NOT NULL DEFAULT 1,
	`show_knowledge_points` tinyint NOT NULL DEFAULT 1,
	`show_answer` tinyint NOT NULL DEFAULT 1,
	`show_explanation` tinyint NOT NULL DEFAULT 1,
	`paper_size` enum('A4','A5','Letter') DEFAULT 'A4',
	`orientation` enum('portrait','landscape') DEFAULT 'portrait',
	`usage_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `favorite_folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(50),
	`question_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_no` varchar(64) NOT NULL,
	`user_id` int,
	`plan_id` int NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'CNY',
	`payment_method` enum('stripe','wechat','alipay'),
	`status` enum('pending','paid','cancelled','refunded','expired') NOT NULL DEFAULT 'pending',
	`paid_at` timestamp,
	`third_party_order_no` varchar(255),
	`buyer_info` json,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `payment_callback_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_no` varchar(64) NOT NULL,
	`payment_method` enum('stripe','wechat','alipay') NOT NULL,
	`third_party_order_no` varchar(255),
	`raw_data` text NOT NULL,
	`signature_valid` tinyint,
	`process_status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
	`process_message` text,
	`ip_address` varchar(45),
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `payment_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_method` enum('stripe','wechat','alipay') NOT NULL,
	`is_enabled` tinyint NOT NULL DEFAULT 0,
	`config` text NOT NULL,
	`last_modified_by` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `push_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`push_type` enum('question','knowledge','resource') NOT NULL,
	`target_filters` json NOT NULL,
	`content_config` json NOT NULL,
	`frequency` enum('daily','weekly','monthly','once') NOT NULL,
	`push_time` varchar(5) NOT NULL DEFAULT '09:00',
	`channels` json NOT NULL,
	`is_enabled` tinyint NOT NULL DEFAULT 1,
	`next_push_time` timestamp,
	`last_push_time` timestamp,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `push_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`target_user_count` int NOT NULL,
	`success_count` int NOT NULL DEFAULT 0,
	`failed_count` int NOT NULL DEFAULT 0,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`channels` json NOT NULL,
	`error_message` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `question_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`question_id` int NOT NULL,
	`recommendation_reason` text,
	`match_score` decimal(5,2) NOT NULL,
	`based_on_error_question_ids` json,
	`weak_knowledge_points` json,
	`is_clicked` tinyint NOT NULL DEFAULT 0,
	`is_practiced` tinyint NOT NULL DEFAULT 0,
	`practice_result` enum('correct','incorrect','skipped'),
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`clicked_at` timestamp,
	`practiced_at` timestamp
);
--> statement-breakpoint
CREATE TABLE `question_review_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`reviewer_id` int NOT NULL,
	`action` enum('approve','reject','request_revision') NOT NULL,
	`previous_status` enum('pending','approved','rejected','needs_revision') NOT NULL,
	`new_status` enum('pending','approved','rejected','needs_revision') NOT NULL,
	`notes` text,
	`modified_fields` json,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `question_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`reviewerName` varchar(200),
	`status` enum('approved','rejected','needs_revision') NOT NULL,
	`accuracyScore` int,
	`difficultyScore` int,
	`clarityScore` int,
	`discriminationScore` int,
	`overallScore` float,
	`notes` text,
	`suggestions` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `question_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_name` varchar(500) NOT NULL,
	`source_school` varchar(255) NOT NULL,
	`source_url` varchar(1000),
	`exam_year` int,
	`exam_semester` enum('first','second'),
	`exam_type` varchar(100),
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('grade7','grade8','grade9','grade10','grade11','grade12') NOT NULL,
	`topic_summary` text,
	`knowledge_points` json,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`relevance_score` decimal(5,2),
	`search_query` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `shared_annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`error_question_id` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`image_url` varchar(500) NOT NULL,
	`annotations` json NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('grade7','grade8','grade9','grade10','grade11','grade12') NOT NULL,
	`like_count` int NOT NULL DEFAULT 0,
	`view_count` int NOT NULL DEFAULT 0,
	`is_public` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`price` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'CNY',
	`duration_days` int NOT NULL,
	`features` json NOT NULL,
	`max_error_questions` int NOT NULL DEFAULT -1,
	`max_ai_analysis` int NOT NULL DEFAULT -1,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `user_practice_behaviors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`question_id` int NOT NULL,
	`behavior_type` enum('view','practice','correct','incorrect','favorite','export') NOT NULL,
	`time_spent` int,
	`score` int,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `user_push_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`push_record_id` int NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`push_type` enum('question','knowledge','resource') NOT NULL,
	`channel` enum('system','email','wechat') NOT NULL,
	`status` enum('sent','failed','read') NOT NULL DEFAULT 'sent',
	`is_read` tinyint NOT NULL DEFAULT 0,
	`read_at` timestamp,
	`is_clicked` tinyint NOT NULL DEFAULT 0,
	`clicked_at` timestamp,
	`related_content_id` int,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `user_similarity_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id_1` int NOT NULL,
	`user_id_2` int NOT NULL,
	`similarity_score` int NOT NULL,
	`common_behavior_count` int NOT NULL,
	`last_calculated_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`order_id` int NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
	`used_ai_analysis` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `achievements` DROP INDEX `achievements_code_unique`;--> statement-breakpoint
ALTER TABLE `email_verification_tokens` DROP INDEX `email_verification_tokens_token_unique`;--> statement-breakpoint
ALTER TABLE `parent_student_relations` DROP INDEX `parent_student_relations_inviteCode_unique`;--> statement-breakpoint
ALTER TABLE `scheduled_tasks` DROP INDEX `scheduled_tasks_task_name_unique`;--> statement-breakpoint
ALTER TABLE `system_settings` DROP INDEX `system_settings_setting_key_unique`;--> statement-breakpoint
ALTER TABLE `user_reminder_settings` DROP INDEX `user_reminder_settings_user_id_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `ai_advice_history` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `email_verification_tokens` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `error_question_tag_relations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `error_question_tags` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `error_review_records` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `exams` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `favorites` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `generated_exam_papers` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `goal_reminders` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `knowledge_points` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `learning_goals` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `learning_path_progress` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `learning_paths` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `parent_student_relations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `practice_pools` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `practice_records` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `question_bank` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `questions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `real_exam_practice_records` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `real_exam_questions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `review_history` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `review_task_reminders` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `review_tasks` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `scheduled_tasks` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `study_plans` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `system_settings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `task_execution_logs` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `user_achievements` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `user_reminder_settings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `video_resources` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `achievements` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `ai_advice_history` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `check_in_records` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `email_verification_tokens` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `error_question_tag_relations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `error_question_tags` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `error_questions` MODIFY COLUMN `isAnalyzed` tinyint;--> statement-breakpoint
ALTER TABLE `error_questions` MODIFY COLUMN `isAnalyzed` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `error_questions` MODIFY COLUMN `isMastered` tinyint;--> statement-breakpoint
ALTER TABLE `error_questions` MODIFY COLUMN `isMastered` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `error_questions` MODIFY COLUMN `isFavorite` tinyint;--> statement-breakpoint
ALTER TABLE `error_questions` MODIFY COLUMN `isFavorite` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `error_questions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `error_review_records` MODIFY COLUMN `isCompleted` tinyint;--> statement-breakpoint
ALTER TABLE `error_review_records` MODIFY COLUMN `isCompleted` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `error_review_records` MODIFY COLUMN `isPaused` tinyint;--> statement-breakpoint
ALTER TABLE `error_review_records` MODIFY COLUMN `isPaused` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `error_review_records` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `exams` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `favorites` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `generated_exam_papers` MODIFY COLUMN `isCompleted` tinyint;--> statement-breakpoint
ALTER TABLE `generated_exam_papers` MODIFY COLUMN `isCompleted` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `generated_exam_papers` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `goal_reminders` MODIFY COLUMN `sent` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `goal_reminders` MODIFY COLUMN `sent` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `goal_reminders` MODIFY COLUMN `read` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `goal_reminders` MODIFY COLUMN `read` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `goal_reminders` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `knowledge_points` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `learning_goals` MODIFY COLUMN `completed` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_goals` MODIFY COLUMN `completed` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `learning_goals` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `learning_path_progress` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `learning_paths` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `learning_progress` MODIFY COLUMN `masteryLevel` float NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_progress` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `parent_student_relations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `practice_pools` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `practice_records` MODIFY COLUMN `isCorrect` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `practice_records` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `question_bank` MODIFY COLUMN `qualityScore` float;--> statement-breakpoint
ALTER TABLE `question_bank` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `isPublished` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `real_exam_practice_records` MODIFY COLUMN `isCorrect` tinyint;--> statement-breakpoint
ALTER TABLE `real_exam_practice_records` MODIFY COLUMN `isBookmarked` tinyint;--> statement-breakpoint
ALTER TABLE `real_exam_practice_records` MODIFY COLUMN `isBookmarked` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `real_exam_practice_records` MODIFY COLUMN `practiceDate` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `real_exam_practice_records` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `real_exam_questions` MODIFY COLUMN `isVerified` tinyint;--> statement-breakpoint
ALTER TABLE `real_exam_questions` MODIFY COLUMN `isVerified` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `real_exam_questions` MODIFY COLUMN `isPublic` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `real_exam_questions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `review_history` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `review_plans` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `review_reminders` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `review_task_reminders` MODIFY COLUMN `sent` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `review_task_reminders` MODIFY COLUMN `sent` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `review_task_reminders` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `review_tasks` MODIFY COLUMN `completed` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `review_tasks` MODIFY COLUMN `completed` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `review_tasks` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `scheduled_tasks` MODIFY COLUMN `task_type` enum('generate_questions','send_reminders','cleanup','check_review_task_reminders','execute_push_tasks') NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_tasks` MODIFY COLUMN `is_enabled` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `scheduled_tasks` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `study_plans` MODIFY COLUMN `completed` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `study_plans` MODIFY COLUMN `completed` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `study_plans` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `system_settings` MODIFY COLUMN `is_encrypted` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `system_settings` MODIFY COLUMN `is_encrypted` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `system_settings` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `task_execution_logs` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `user_achievements` MODIFY COLUMN `unlockedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `user_reminder_settings` MODIFY COLUMN `enabled` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `user_reminder_settings` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email_verified` tinyint;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email_verified` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `video_resources` MODIFY COLUMN `relevanceScore` float;--> statement-breakpoint
ALTER TABLE `video_resources` MODIFY COLUMN `qualityScore` float;--> statement-breakpoint
ALTER TABLE `video_resources` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `question_bank` ADD `reviewStatus` enum('pending','approved','rejected','needs_revision') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `question_bank` ADD `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `question_bank` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `question_bank` ADD `reviewNotes` text;--> statement-breakpoint
ALTER TABLE `review_plans` ADD `next_review_at` timestamp;--> statement-breakpoint
ALTER TABLE `review_plans` ADD `next_review_date` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `points` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `total_feedback_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `account_credentials` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_login_account` ON `account_credentials` (`login_account`);--> statement-breakpoint
CREATE INDEX `user_id` ON `account_credentials` (`user_id`);--> statement-breakpoint
CREATE INDEX `login_account` ON `account_credentials` (`login_account`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `ai_annotation_feedback` (`user_id`);--> statement-breakpoint
CREATE INDEX `annotation_id_idx` ON `ai_annotation_feedback` (`annotation_id`);--> statement-breakpoint
CREATE INDEX `chart_type_idx` ON `ai_annotation_feedback` (`chart_type`);--> statement-breakpoint
CREATE INDEX `rating_idx` ON `ai_annotation_feedback` (`rating`);--> statement-breakpoint
CREATE INDEX `source_id_idx` ON `ai_generated_questions` (`source_id`);--> statement-breakpoint
CREATE INDEX `subject_grade_idx` ON `ai_generated_questions` (`subject`,`grade`);--> statement-breakpoint
CREATE INDEX `review_status_idx` ON `ai_generated_questions` (`review_status`);--> statement-breakpoint
CREATE INDEX `is_public_idx` ON `ai_generated_questions` (`is_public`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `ai_question_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `question_id_idx` ON `ai_question_favorites` (`question_id`);--> statement-breakpoint
CREATE INDEX `user_question_unique_idx` ON `ai_question_favorites` (`user_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `shared_annotation_id_idx` ON `annotation_comments` (`shared_annotation_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `annotation_comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `unique_like` ON `annotation_likes` (`shared_annotation_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `annotation_templates` (`category`);--> statement-breakpoint
CREATE INDEX `subject_idx` ON `annotation_templates` (`subject`);--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `annotation_templates` (`created_by`);--> statement-breakpoint
CREATE INDEX `user_item_idx` ON `annotations` (`user_id`,`item_type`,`item_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `chart_annotations` (`user_id`);--> statement-breakpoint
CREATE INDEX `error_question_id_idx` ON `chart_annotations` (`error_question_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `chart_data_extractions` (`user_id`);--> statement-breakpoint
CREATE INDEX `error_question_id_idx` ON `chart_data_extractions` (`error_question_id`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `chart_type_templates` (`category`);--> statement-breakpoint
CREATE INDEX `chart_type` ON `chart_type_templates` (`chart_type`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `collection_tasks` (`user_id`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `collection_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `template_type` ON `email_templates` (`template_type`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `export_templates` (`user_id`);--> statement-breakpoint
CREATE INDEX `is_public_idx` ON `export_templates` (`is_public`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `favorite_folders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_order_no` ON `orders` (`order_no`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `order_no` ON `orders` (`order_no`);--> statement-breakpoint
CREATE INDEX `payment_method` ON `payment_configs` (`payment_method`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `question_recommendations` (`user_id`);--> statement-breakpoint
CREATE INDEX `question_id_idx` ON `question_recommendations` (`question_id`);--> statement-breakpoint
CREATE INDEX `user_question_idx` ON `question_recommendations` (`user_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `question_id_idx` ON `question_review_records` (`question_id`);--> statement-breakpoint
CREATE INDEX `reviewer_id_idx` ON `question_review_records` (`reviewer_id`);--> statement-breakpoint
CREATE INDEX `school_subject_idx` ON `question_sources` (`source_school`,`subject`);--> statement-breakpoint
CREATE INDEX `grade_subject_idx` ON `question_sources` (`grade`,`subject`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `shared_annotations` (`user_id`);--> statement-breakpoint
CREATE INDEX `subject_grade_idx` ON `shared_annotations` (`subject`,`grade`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_practice_behaviors` (`user_id`);--> statement-breakpoint
CREATE INDEX `question_id_idx` ON `user_practice_behaviors` (`question_id`);--> statement-breakpoint
CREATE INDEX `behavior_type_idx` ON `user_practice_behaviors` (`behavior_type`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `user_practice_behaviors` (`created_at`);--> statement-breakpoint
CREATE INDEX `user_1_idx` ON `user_similarity_cache` (`user_id_1`);--> statement-breakpoint
CREATE INDEX `user_2_idx` ON `user_similarity_cache` (`user_id_2`);--> statement-breakpoint
CREATE INDEX `score_idx` ON `user_similarity_cache` (`similarity_score`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `user_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `user_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `achievements_code_unique` ON `achievements` (`code`);--> statement-breakpoint
CREATE INDEX `token` ON `email_verification_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `parent_student_relations_inviteCode_unique` ON `parent_student_relations` (`inviteCode`);--> statement-breakpoint
CREATE INDEX `scheduled_tasks_task_name_unique` ON `scheduled_tasks` (`task_name`);--> statement-breakpoint
CREATE INDEX `setting_key` ON `system_settings` (`setting_key`);--> statement-breakpoint
CREATE INDEX `user_reminder_settings_user_id_unique` ON `user_reminder_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);