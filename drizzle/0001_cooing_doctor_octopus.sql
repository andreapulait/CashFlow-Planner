CREATE TABLE `fiumi` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`iniziale` int NOT NULL,
	`rendimento` int NOT NULL,
	`annoCreazione` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fiumi_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `fiumi` ADD CONSTRAINT `fiumi_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;