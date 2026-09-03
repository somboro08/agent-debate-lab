CREATE TABLE `debateMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`objectiveId` int NOT NULL,
	`sequence` int NOT NULL,
	`speaker` varchar(160) NOT NULL,
	`role` varchar(80) NOT NULL,
	`tone` varchar(30) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `debateMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `objectives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`position` int NOT NULL,
	`title` varchar(1000) NOT NULL,
	`status` enum('active','completed','pending') NOT NULL DEFAULT 'pending',
	`verdict` text,
	`criterion` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `objectives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionKey` varchar(80) NOT NULL,
	`name` varchar(160) NOT NULL,
	`context` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_sessionKey_unique` UNIQUE(`sessionKey`)
);
