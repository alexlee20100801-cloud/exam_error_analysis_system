CREATE TABLE `goal_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalId` int NOT NULL,
	`parentId` int NOT NULL,
	`studentId` int NOT NULL,
	`reminderType` enum('deadline_approaching','progress_behind','goal_failed','goal_achieved') NOT NULL,
	`message` text NOT NULL,
	`sent` boolean NOT NULL DEFAULT false,
	`sentAt` timestamp,
	`read` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goal_reminders_id` PRIMARY KEY(`id`)
);
