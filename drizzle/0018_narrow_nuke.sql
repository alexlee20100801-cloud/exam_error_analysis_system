CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3') NOT NULL,
	`semester` enum('first','second'),
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`questionType` enum('choice','fillBlank','shortAnswer','essay') NOT NULL,
	`options` json,
	`correctAnswer` text NOT NULL,
	`explanation` text,
	`knowledgePoints` json,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`isPublished` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
