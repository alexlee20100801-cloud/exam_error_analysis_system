CREATE TABLE `collaborative_collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`owner_id` int NOT NULL,
	`visibility` enum('private','public','link') NOT NULL DEFAULT 'private',
	`member_count` int NOT NULL DEFAULT 1,
	`question_count` int NOT NULL DEFAULT 0,
	`comment_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaborative_collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collection_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collection_id` int NOT NULL,
	`user_id` int NOT NULL,
	`activity_type` varchar(50) NOT NULL,
	`details` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `collection_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collection_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collection_id` int NOT NULL,
	`question_id` int,
	`user_id` int NOT NULL,
	`content` text NOT NULL,
	`parent_id` int,
	`like_count` int NOT NULL DEFAULT 0,
	`reply_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collection_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collection_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collection_id` int NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
	`invited_by` int,
	`invited_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`last_accessed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `collection_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collection_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collection_id` int NOT NULL,
	`question_id` int NOT NULL,
	`added_by` int NOT NULL,
	`note` text,
	`added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `collection_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comment_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`comment_id` int NOT NULL,
	`user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `comment_likes_id` PRIMARY KEY(`id`)
);
