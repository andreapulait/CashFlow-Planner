CREATE TABLE `alertConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tipo` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`attivo` int NOT NULL DEFAULT 1,
	`soglia` int NOT NULL,
	`fiumeId` int,
	`operatore` varchar(10) NOT NULL DEFAULT 'gte',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertConfig_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifiche` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tipo` varchar(50) NOT NULL,
	`titolo` varchar(255) NOT NULL,
	`messaggio` text NOT NULL,
	`fiumeId` int,
	`letta` int NOT NULL DEFAULT 0,
	`priorita` varchar(20) NOT NULL DEFAULT 'medium',
	`link` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifiche_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `alertConfig` ADD CONSTRAINT `alertConfig_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifiche` ADD CONSTRAINT `notifiche_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;