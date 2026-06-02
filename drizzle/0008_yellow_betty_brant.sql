ALTER TABLE `affluenti` ADD `mese` int NOT NULL;--> statement-breakpoint
ALTER TABLE `fiumi` ADD `meseCreazione` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reinvestimenti` ADD `mese` int NOT NULL;--> statement-breakpoint
ALTER TABLE `affluenti` DROP COLUMN `dataInserimento`;--> statement-breakpoint
ALTER TABLE `fiumi` DROP COLUMN `dataCreazione`;--> statement-breakpoint
ALTER TABLE `reinvestimenti` DROP COLUMN `dataEsecuzione`;