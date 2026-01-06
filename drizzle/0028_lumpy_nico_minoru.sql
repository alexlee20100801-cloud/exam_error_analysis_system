CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_type` varchar(100) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`subject` varchar(500) NOT NULL,
	`html_content` text NOT NULL,
	`available_variables` json,
	`is_default` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`last_modified_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_templates_template_type_unique` UNIQUE(`template_type`)
);
