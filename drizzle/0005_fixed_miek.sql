CREATE TABLE `scenari` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descrizione` text,
	`attivo` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scenari_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenarioSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scenarioId` int NOT NULL,
	`fiumiData` text NOT NULL,
	`apportiData` text NOT NULL,
	`reinvestimentiData` text NOT NULL,
	`impostazioniData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scenarioSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `scenari` ADD CONSTRAINT `scenari_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scenarioSnapshots` ADD CONSTRAINT `scenarioSnapshots_scenarioId_scenari_id_fk` FOREIGN KEY (`scenarioId`) REFERENCES `scenari`(`id`) ON DELETE cascade ON UPDATE no action;