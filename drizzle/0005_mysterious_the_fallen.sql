CREATE TABLE `error_review_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`errorQuestionId` int NOT NULL,
	`reviewRound` int NOT NULL DEFAULT 0,
	`lastReviewedAt` timestamp,
	`nextReviewAt` timestamp NOT NULL,
	`isCompleted` boolean DEFAULT false,
	`isPaused` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `error_review_records_id` PRIMARY KEY(`id`)
);
