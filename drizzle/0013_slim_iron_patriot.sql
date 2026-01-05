CREATE TABLE `learning_path_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`path_id` int NOT NULL,
	`node_id` varchar(100) NOT NULL,
	`knowledge_point_id` int,
	`status` enum('locked','available','in_progress','completed') NOT NULL DEFAULT 'locked',
	`score` int,
	`attempts` int NOT NULL DEFAULT 0,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_path_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_paths` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3') NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`path_data` json,
	`total_nodes` int NOT NULL DEFAULT 0,
	`completed_nodes` int NOT NULL DEFAULT 0,
	`status` enum('active','completed','paused') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_paths_id` PRIMARY KEY(`id`)
);
