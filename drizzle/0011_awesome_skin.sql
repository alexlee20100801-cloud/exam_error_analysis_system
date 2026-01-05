CREATE TABLE `generated_exam_papers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3') NOT NULL,
	`schoolLevel` enum('junior','senior') NOT NULL,
	`totalQuestions` int NOT NULL,
	`totalScore` int NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`knowledgePointIds` json,
	`questionTypes` json,
	`questions` json,
	`isCompleted` boolean DEFAULT false,
	`completedAt` timestamp,
	`totalTimeSpent` int,
	`userScore` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generated_exam_papers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `real_exam_practice_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`userAnswer` text,
	`isCorrect` boolean,
	`timeSpent` int,
	`score` decimal(5,2),
	`isBookmarked` boolean DEFAULT false,
	`practiceDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `real_exam_practice_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `real_exam_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`questionType` enum('choice','blank','short_answer','essay','calculation') NOT NULL,
	`answer` text NOT NULL,
	`explanation` text,
	`imageUrl` text,
	`imageKey` varchar(500),
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3') NOT NULL,
	`schoolLevel` enum('junior','senior') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`knowledgePointIds` json,
	`sourceSchool` varchar(200),
	`sourceRegion` varchar(100),
	`examYear` int,
	`examSemester` enum('first','second'),
	`examType` varchar(100),
	`usageCount` int DEFAULT 0,
	`averageScore` decimal(5,2),
	`isVerified` boolean DEFAULT false,
	`isPublic` boolean DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `real_exam_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `region` varchar(100);