CREATE TABLE `error_question_tag_relations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`errorQuestionId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `error_question_tag_relations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `error_question_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT '#3B82F6',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `error_question_tags_id` PRIMARY KEY(`id`)
);
