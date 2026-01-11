CREATE TABLE `captcha_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`captcha_id` varchar(64) NOT NULL,
	`code` varchar(10) NOT NULL,
	`used` tinyint NOT NULL DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `captcha_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `captcha_id_idx` ON `captcha_codes` (`captcha_id`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `captcha_codes` (`expires_at`);