CREATE TABLE `error_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`imageUrl` text,
	`imageKey` varchar(500),
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3') NOT NULL,
	`difficulty` enum('easy','medium','hard'),
	`errorAnalysis` text,
	`correctAnswer` text,
	`detailedExplanation` text,
	`knowledgePointIds` json,
	`userAnswer` text,
	`userNotes` text,
	`isAnalyzed` boolean DEFAULT false,
	`isMastered` boolean DEFAULT false,
	`reviewCount` int DEFAULT 0,
	`lastReviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `error_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3') NOT NULL,
	`level` enum('chapter','section','point') NOT NULL,
	`parentId` int,
	`description` text,
	`difficulty` enum('easy','medium','hard') DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`knowledgePointId` int NOT NULL,
	`masteryLevel` float NOT NULL DEFAULT 0,
	`practiceCount` int DEFAULT 0,
	`correctCount` int DEFAULT 0,
	`errorCount` int DEFAULT 0,
	`status` enum('not_started','learning','reviewing','mastered') DEFAULT 'not_started',
	`lastPracticeAt` timestamp,
	`nextReviewAt` timestamp,
	`reviewInterval` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`questionType` enum('error_question','practice_question') NOT NULL,
	`userAnswer` text NOT NULL,
	`isCorrect` boolean NOT NULL,
	`timeSpent` int,
	`knowledgePointIds` json,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practice_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_bank` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`answer` text NOT NULL,
	`explanation` text,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`knowledgePointIds` json,
	`source` enum('builtin','thirdparty','ai_generated') DEFAULT 'builtin',
	`sourceId` varchar(200),
	`qualityScore` float DEFAULT 0,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_bank_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetType` enum('error_question','knowledge_point') NOT NULL,
	`targetId` int NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`status` enum('pending','completed','skipped') DEFAULT 'pending',
	`completedAt` timestamp,
	`completionNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`platform` enum('bilibili','youtube') NOT NULL,
	`videoId` varchar(200) NOT NULL,
	`videoUrl` text NOT NULL,
	`thumbnailUrl` text,
	`duration` int,
	`author` varchar(200),
	`viewCount` int DEFAULT 0,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3'),
	`knowledgePointIds` json,
	`relevanceScore` float DEFAULT 0,
	`qualityScore` float DEFAULT 0,
	`recommendCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `grade` enum('junior1','junior2','junior3','senior1','senior2','senior3');--> statement-breakpoint
ALTER TABLE `users` ADD `school` varchar(200);