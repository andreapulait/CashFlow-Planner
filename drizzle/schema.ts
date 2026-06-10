import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** 'email' | 'google' */
  authProvider: varchar("authProvider", { length: 20 }).notNull().default("email"),
  oauthProviderId: varchar("oauthProviderId", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const fiumi = pgTable("fiumi", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nome: varchar("nome", { length: 255 }).notNull(),
  /** Sorgente (capitale iniziale) in centesimi */
  sorgente: integer("sorgente").notNull(),
  /** Tasso annuo in basis points (es. 800 = 8.00%) */
  rendimento: integer("rendimento").notNull(),
  /** Mese di partenza del fiume (0 = T0) */
  meseCreazione: integer("meseCreazione").default(0).notNull(),
  /** Data reale di partenza (ha priorità su meseCreazione se presente) */
  dataCreazione: timestamp("dataCreazione"),
  /** % rendita mensile reinvestita (NULL = 100%). 0 = tutto prelevato */
  percentualeReinvestimento: integer("percentualeReinvestimento"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Fiume = typeof fiumi.$inferSelect;
export type InsertFiume = typeof fiumi.$inferInsert;

export const impostazioni = pgTable("impostazioni", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Obiettivo cash flow mensile in centesimi */
  obiettivoMensile: integer("obiettivoMensile").default(2000000).notNull(),
  /** Orizzonte temporale in mesi */
  orizzonteTemporale: integer("orizzonteTemporale").default(60).notNull(),
  /** Data di riferimento per il mese 0 */
  dataInizio: timestamp("dataInizio"),
  /** Budget mensile affluenti in centesimi (NULL = nessun limite) */
  budgetMensileAffluenti: integer("budgetMensileAffluenti"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Impostazioni = typeof impostazioni.$inferSelect;
export type InsertImpostazioni = typeof impostazioni.$inferInsert;

export const affluenti = pgTable("affluenti", {
  id: serial("id").primaryKey(),
  fiumeId: integer("fiumeId")
    .notNull()
    .references(() => fiumi.id, { onDelete: "cascade" }),
  /** Importo in centesimi */
  importo: integer("importo").notNull(),
  /** Mese in cui viene aggiunto (0 = T0) */
  mese: integer("mese").notNull(),
  dataAffluente: timestamp("dataAffluente"),
  descrizione: text("descrizione"),
  ricorrente: boolean("ricorrente").default(false).notNull(),
  /** Mesi tra occorrenze: 1=mensile, 3=trimestrale, 6=semestrale, 12=annuale */
  periodicita: integer("periodicita"),
  durataMesi: integer("durataMesi"),
  groupId: varchar("groupId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Affluente = typeof affluenti.$inferSelect;
export type InsertAffluente = typeof affluenti.$inferInsert;

export const reinvestimenti = pgTable("reinvestimenti", {
  id: serial("id").primaryKey(),
  fiumeOrigineId: integer("fiumeOrigineId")
    .notNull()
    .references(() => fiumi.id, { onDelete: "cascade" }),
  fiumeDestinazioneId: integer("fiumeDestinazioneId").references(() => fiumi.id, {
    onDelete: "set null",
  }),
  meseReinvestimento: integer("meseReinvestimento").notNull(),
  dataReinvestimento: timestamp("dataReinvestimento"),
  /** Importo fisso in centesimi */
  importoFisso: integer("importoFisso"),
  /** Percentuale in basis points (es. 2000 = 20%) */
  percentuale: integer("percentuale"),
  nuovoFiumeNome: text("nuovoFiumeNome"),
  nuovoFiumeRendimento: integer("nuovoFiumeRendimento"),
  descrizione: text("descrizione"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Reinvestimento = typeof reinvestimenti.$inferSelect;
export type InsertReinvestimento = typeof reinvestimenti.$inferInsert;

// ─── Reinvestimenti Periodici ─────────────────────────────────────────────────
// Regola dinamica: ogni N mesi, preleva X% dalla rendita (o capitale)
// di fiumeOrigine e versalo in fiumeDestinazione.
// Il calcolo avviene in tempo reale nella simulazione — non precalcolato.
export const reinvestimentiPeriodici = pgTable("reinvestimentiPeriodici", {
  id: serial("id").primaryKey(),
  fiumeOrigineId: integer("fiumeOrigineId")
    .notNull()
    .references(() => fiumi.id, { onDelete: "cascade" }),
  fiumeDestinazioneId: integer("fiumeDestinazioneId")
    .references(() => fiumi.id, { onDelete: "set null" }),
  meseInizio: integer("meseInizio").notNull(),
  meseFine: integer("meseFine").notNull(),
  /** Mesi tra applicazioni: 1=mensile, 3=trimestrale, 6=semestrale, 12=annuale */
  periodicita: integer("periodicita").notNull().default(1),
  /** "rendita" = % della rendita mensile | "capitale" = % del capitale accumulato */
  tipoCalcolo: varchar("tipoCalcolo", { length: 20 }).notNull().default("rendita"),
  /** Percentuale in basis points (es. 2000 = 20%) */
  percentuale: integer("percentuale").notNull(),
  descrizione: text("descrizione"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ReinvestimentoPeriodico = typeof reinvestimentiPeriodici.$inferSelect;
export type InsertReinvestimentoPeriodico = typeof reinvestimentiPeriodici.$inferInsert;

export const scenari = pgTable("scenari", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nome: varchar("nome", { length: 255 }).notNull(),
  descrizione: text("descrizione"),
  attivo: integer("attivo").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Scenario = typeof scenari.$inferSelect;
export type InsertScenario = typeof scenari.$inferInsert;

export const scenarioSnapshots = pgTable("scenarioSnapshots", {
  id: serial("id").primaryKey(),
  scenarioId: integer("scenarioId")
    .notNull()
    .references(() => scenari.id, { onDelete: "cascade" }),
  fiumiData: text("fiumiData").notNull(),
  affluentiData: text("affluentiData").notNull(),
  reinvestimentiData: text("reinvestimentiData").notNull(),
  impostazioniData: text("impostazioniData").notNull(),
  /** reinvestimenti periodici — nullable per compatibilità con snapshot creati prima della feature */
  reinvestimentiPeriodicaData: text("reinvestimentiPeriodicaData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScenarioSnapshot = typeof scenarioSnapshots.$inferSelect;
export type InsertScenarioSnapshot = typeof scenarioSnapshots.$inferInsert;

export const notifiche = pgTable("notifiche", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  titolo: varchar("titolo", { length: 255 }).notNull(),
  messaggio: text("messaggio").notNull(),
  fiumeId: integer("fiumeId"),
  letta: integer("letta").default(0).notNull(),
  priorita: varchar("priorita", { length: 20 }).default("medium").notNull(),
  link: varchar("link", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notifica = typeof notifiche.$inferSelect;
export type InsertNotifica = typeof notifiche.$inferInsert;

export const alertConfig = pgTable("alertConfig", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  attivo: integer("attivo").default(1).notNull(),
  soglia: integer("soglia"),
  fiumeId: integer("fiumeId"),
  operatore: varchar("operatore", { length: 10 }).default("gte"),
  dataAlert: timestamp("dataAlert"),
  giorniPreavviso: integer("giorniPreavviso"),
  affluenteId: integer("affluenteId"),
  /** 0 = non ancora notificato, 1 = notifica già inviata */
  triggered: integer("triggered").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AlertConfig = typeof alertConfig.$inferSelect;
export type InsertAlertConfig = typeof alertConfig.$inferInsert;

export const eventiReali = pgTable("eventiReali", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fiumeId: integer("fiumeId").references(() => fiumi.id, { onDelete: "set null" }),
  /** FK espliciti Approach A: collegamento evento reale → voce del piano */
  fiumePianoId: integer("fiumePianoId").references(() => fiumi.id, { onDelete: "set null" }),
  affluenteId: integer("affluenteId").references(() => affluenti.id, { onDelete: "set null" }),
  reinvestimentoId: integer("reinvestimentoId").references(() => reinvestimenti.id, { onDelete: "set null" }),
  /** 'apporto' | 'rendita' | 'capitale' | 'prelievo' */
  tipo: varchar("tipo", { length: 20 }).notNull(),
  /** Importo in centesimi */
  importo: integer("importo").notNull(),
  /** Data reale dell'evento */
  data: timestamp("data").notNull(),
  descrizione: text("descrizione"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EventoReale = typeof eventiReali.$inferSelect;
export type InsertEventoReale = typeof eventiReali.$inferInsert;

export const passwordResetTokens = pgTable("passwordResetTokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: integer("used").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Alias retrocompatibilità
export type Apporto = Affluente;
export type InsertApporto = InsertAffluente;
export const apporti = affluenti;
