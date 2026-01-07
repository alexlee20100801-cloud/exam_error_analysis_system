CREATE TABLE `document_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int NOT NULL,
	`user_id` int NOT NULL,
	`export_format` enum('word','pdf','markdown','latex','json') NOT NULL,
	`export_file_url` varchar(500) NOT NULL,
	`export_file_key` varchar(500) NOT NULL,
	`export_config` json,
	`file_size` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `document_exports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_regions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int NOT NULL,
	`x` decimal(10,6) NOT NULL,
	`y` decimal(10,6) NOT NULL,
	`width` decimal(10,6) NOT NULL,
	`height` decimal(10,6) NOT NULL,
	`region_type` enum('text','formula','chart','table','image','mixed') NOT NULL,
	`processed_image_url` varchar(500),
	`processed_image_key` varchar(500),
	`needs_handwriting_removal` int NOT NULL DEFAULT 1,
	`processing_status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_regions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `handwriting_removal_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region_id` int NOT NULL,
	`document_id` int NOT NULL,
	`before_image_url` varchar(500) NOT NULL,
	`before_image_key` varchar(500) NOT NULL,
	`after_image_url` varchar(500) NOT NULL,
	`after_image_key` varchar(500) NOT NULL,
	`detected_handwriting` json,
	`processing_params` json,
	`processing_time_ms` int,
	`quality_score` decimal(5,2),
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `handwriting_removal_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recognized_contents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region_id` int NOT NULL,
	`document_id` int NOT NULL,
	`content_type` enum('text','formula','chart_data','table_data','image_description') NOT NULL,
	`raw_content` text NOT NULL,
	`structured_data` json,
	`editable_format` enum('plain_text','markdown','latex','json','html') NOT NULL,
	`editable_content` text NOT NULL,
	`confidence` decimal(5,2),
	`is_edited` int NOT NULL DEFAULT 0,
	`user_edited_content` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recognized_contents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uploaded_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`original_file_name` varchar(255) NOT NULL,
	`file_type` enum('image','pdf','word') NOT NULL,
	`file_size` int NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`original_file_url` varchar(500) NOT NULL,
	`original_file_key` varchar(500) NOT NULL,
	`processing_status` enum('uploaded','region_selecting','processing','completed','failed') NOT NULL DEFAULT 'uploaded',
	`error_message` text,
	`total_regions` int NOT NULL DEFAULT 0,
	`total_contents` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `uploaded_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `document_id_idx` ON `document_exports` (`document_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `document_exports` (`user_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `document_exports` (`created_at`);--> statement-breakpoint
CREATE INDEX `document_id_idx` ON `document_regions` (`document_id`);--> statement-breakpoint
CREATE INDEX `region_type_idx` ON `document_regions` (`region_type`);--> statement-breakpoint
CREATE INDEX `processing_status_idx` ON `document_regions` (`processing_status`);--> statement-breakpoint
CREATE INDEX `region_id_idx` ON `handwriting_removal_logs` (`region_id`);--> statement-breakpoint
CREATE INDEX `document_id_idx` ON `handwriting_removal_logs` (`document_id`);--> statement-breakpoint
CREATE INDEX `region_id_idx` ON `recognized_contents` (`region_id`);--> statement-breakpoint
CREATE INDEX `document_id_idx` ON `recognized_contents` (`document_id`);--> statement-breakpoint
CREATE INDEX `content_type_idx` ON `recognized_contents` (`content_type`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `uploaded_documents` (`user_id`);--> statement-breakpoint
CREATE INDEX `processing_status_idx` ON `uploaded_documents` (`processing_status`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `uploaded_documents` (`created_at`);