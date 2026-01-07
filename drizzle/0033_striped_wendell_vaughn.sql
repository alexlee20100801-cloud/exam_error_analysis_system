CREATE TABLE `id_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`card_type` enum('id_card','student_card','driver_license','passport','other') NOT NULL,
	`card_name` varchar(128) NOT NULL,
	`front_image_url` varchar(500) NOT NULL,
	`back_image_url` varchar(500),
	`merged_image_url` varchar(500),
	`a4_layout_image_url` varchar(500),
	`extracted_info` json,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `id_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `id_cards` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_card_type` ON `id_cards` (`card_type`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `id_cards` (`created_at`);