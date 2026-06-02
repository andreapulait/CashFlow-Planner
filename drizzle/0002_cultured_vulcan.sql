CREATE TABLE `impostazioni` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`obiettivoMensile` int NOT NULL DEFAULT 2000000,
	`orizzonteTemporale` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `impostazioni_id` PRIMARY KEY(`id`),
	CONSTRAINT `impostazioni_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `impostazioni` ADD CONSTRAINT `impostazioni_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;