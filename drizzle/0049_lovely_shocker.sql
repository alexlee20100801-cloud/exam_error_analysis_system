CREATE TABLE `print_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`template_id` int,
	`question_ids` text NOT NULL,
	`question_count` int NOT NULL,
	`config_snapshot` text NOT NULL,
	`export_type` varchar(50) NOT NULL,
	`file_url` text,
	`file_size` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `print_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `print_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`layout` varchar(50) NOT NULL DEFAULT 'single',
	`font_size` int NOT NULL DEFAULT 14,
	`margin_top` int NOT NULL DEFAULT 20,
	`margin_bottom` int NOT NULL DEFAULT 20,
	`margin_left` int NOT NULL DEFAULT 20,
	`margin_right` int NOT NULL DEFAULT 20,
	`include_ai_analysis` boolean NOT NULL DEFAULT true,
	`include_answer` boolean NOT NULL DEFAULT true,
	`include_explanation` boolean NOT NULL DEFAULT true,
	`include_knowledge_points` boolean NOT NULL DEFAULT true,
	`include_image` boolean NOT NULL DEFAULT true,
	`header_text` text,
	`footer_text` text,
	`show_page_number` boolean NOT NULL DEFAULT true,
	`paper_size` varchar(20) NOT NULL DEFAULT 'A4',
	`orientation` varchar(20) NOT NULL DEFAULT 'portrait',
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `print_templates_id` PRIMARY KEY(`id`)
);
