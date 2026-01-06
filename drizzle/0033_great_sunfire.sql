CREATE TABLE `question_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`reviewerName` varchar(200),
	`status` enum('approved','rejected','needs_revision') NOT NULL,
	`accuracyScore` int,
	`difficultyScore` int,
	`clarityScore` int,
	`discriminationScore` int,
	`overallScore` float,
	`notes` text,
	`suggestions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `question_bank` ADD `reviewStatus` enum('pending','approved','rejected','needs_revision') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `question_bank` ADD `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `question_bank` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `question_bank` ADD `reviewNotes` text;