-- ============================================================================
-- Cash Flow Planner — Schema PostgreSQL per Supabase
-- Esegui questo script nella Supabase SQL Editor del tuo progetto
-- ============================================================================

-- Enum per il ruolo utente
CREATE TYPE "role" AS ENUM ('user', 'admin');

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "users" (
  "id"               SERIAL PRIMARY KEY,
  "openId"           VARCHAR(64)  UNIQUE,
  "name"             TEXT,
  "email"            VARCHAR(320) UNIQUE,
  "passwordHash"     VARCHAR(255),
  "authProvider"     VARCHAR(20)  NOT NULL DEFAULT 'email',
  "oauthProviderId"  VARCHAR(255),
  "loginMethod"      VARCHAR(64),
  "role"             "role"       NOT NULL DEFAULT 'user',
  "createdAt"        TIMESTAMP    NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMP    NOT NULL DEFAULT NOW(),
  "lastSignedIn"     TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Impostazioni (una riga per utente) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "impostazioni" (
  "id"                      SERIAL PRIMARY KEY,
  "userId"                  INTEGER NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "obiettivoMensile"        INTEGER NOT NULL DEFAULT 2000000,  -- 20.000 € in centesimi
  "orizzonteTemporale"      INTEGER NOT NULL DEFAULT 60,       -- mesi
  "dataInizio"              TIMESTAMP,
  "budgetMensileAffluenti"  INTEGER,
  "createdAt"               TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"               TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Fiumi ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "fiumi" (
  "id"                        SERIAL PRIMARY KEY,
  "userId"                    INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "nome"                      VARCHAR(255) NOT NULL,
  "sorgente"                  INTEGER NOT NULL,           -- centesimi
  "rendimento"                INTEGER NOT NULL,           -- basis points (800 = 8.00%)
  "meseCreazione"             INTEGER NOT NULL DEFAULT 0,
  "dataCreazione"             TIMESTAMP,
  "percentualeReinvestimento" INTEGER,                    -- 0-100, NULL = 100%
  "createdAt"                 TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"                 TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Affluenti ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "affluenti" (
  "id"           SERIAL PRIMARY KEY,
  "fiumeId"      INTEGER NOT NULL REFERENCES "fiumi"("id") ON DELETE CASCADE,
  "importo"      INTEGER NOT NULL,   -- centesimi
  "mese"         INTEGER NOT NULL,
  "dataAffluente" TIMESTAMP,
  "descrizione"  TEXT,
  "ricorrente"   BOOLEAN NOT NULL DEFAULT FALSE,
  "periodicita"  INTEGER,            -- 1=mensile, 3=trimestrale, 6=semestrale, 12=annuale
  "durataMesi"   INTEGER,
  "groupId"      VARCHAR(36),
  "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Reinvestimenti ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "reinvestimenti" (
  "id"                    SERIAL PRIMARY KEY,
  "fiumeOrigineId"        INTEGER NOT NULL REFERENCES "fiumi"("id") ON DELETE CASCADE,
  "fiumeDestinazioneId"   INTEGER REFERENCES "fiumi"("id") ON DELETE SET NULL,
  "meseReinvestimento"    INTEGER NOT NULL,
  "dataReinvestimento"    TIMESTAMP,
  "importoFisso"          INTEGER,   -- centesimi
  "percentuale"           INTEGER,   -- basis points
  "nuovoFiumeNome"        TEXT,
  "nuovoFiumeRendimento"  INTEGER,
  "descrizione"           TEXT,
  "createdAt"             TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Migrazione per DB esistenti: aggiunge la colonna se non presente
ALTER TABLE "reinvestimenti" ADD COLUMN IF NOT EXISTS "descrizione" TEXT;

-- ── Reinvestimenti Periodici ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "reinvestimentiPeriodici" (
  "id"                  SERIAL PRIMARY KEY,
  "fiumeOrigineId"      INTEGER NOT NULL REFERENCES "fiumi"("id") ON DELETE CASCADE,
  "fiumeDestinazioneId" INTEGER REFERENCES "fiumi"("id") ON DELETE SET NULL,
  "meseInizio"          INTEGER NOT NULL,
  "meseFine"            INTEGER NOT NULL,
  "periodicita"         INTEGER NOT NULL DEFAULT 1,
  "tipoCalcolo"         VARCHAR(20) NOT NULL DEFAULT 'rendita',
  "percentuale"         INTEGER NOT NULL,
  "descrizione"         TEXT,
  "createdAt"           TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_reinvPeriodici_origine" ON "reinvestimentiPeriodici"("fiumeOrigineId");

-- ── Scenari ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "scenari" (
  "id"          SERIAL PRIMARY KEY,
  "userId"      INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "nome"        VARCHAR(255) NOT NULL,
  "descrizione" TEXT,
  "attivo"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "scenarioSnapshots" (
  "id"                 SERIAL PRIMARY KEY,
  "scenarioId"         INTEGER NOT NULL REFERENCES "scenari"("id") ON DELETE CASCADE,
  "fiumiData"                   TEXT NOT NULL,
  "affluentiData"               TEXT NOT NULL,
  "reinvestimentiData"          TEXT NOT NULL,
  "impostazioniData"            TEXT NOT NULL,
  "reinvestimentiPeriodicaData" TEXT,
  "createdAt"          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Notifiche ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notifiche" (
  "id"        SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tipo"      VARCHAR(50)  NOT NULL,
  "titolo"    VARCHAR(255) NOT NULL,
  "messaggio" TEXT         NOT NULL,
  "fiumeId"   INTEGER,
  "letta"     INTEGER      NOT NULL DEFAULT 0,
  "priorita"  VARCHAR(20)  NOT NULL DEFAULT 'medium',
  "link"      VARCHAR(255),
  "createdAt" TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Alert Config ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "alertConfig" (
  "id"               SERIAL PRIMARY KEY,
  "userId"           INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tipo"             VARCHAR(50)  NOT NULL,
  "nome"             VARCHAR(255) NOT NULL,
  "attivo"           INTEGER      NOT NULL DEFAULT 1,
  "soglia"           INTEGER,
  "fiumeId"          INTEGER,
  "operatore"        VARCHAR(10)  DEFAULT 'gte',
  "dataAlert"        TIMESTAMP,
  "giorniPreavviso"  INTEGER,
  "affluenteId"      INTEGER,
  "triggered"        INTEGER      NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP    NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMP    NOT NULL DEFAULT NOW()
);
ALTER TABLE "alertConfig" ADD COLUMN IF NOT EXISTS "triggered" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "scenarioSnapshots" ADD COLUMN IF NOT EXISTS "reinvestimentiPeriodicaData" TEXT;

-- ── Password Reset Tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "passwordResetTokens" (
  "id"        SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token"     VARCHAR(255) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP    NOT NULL,
  "used"      INTEGER      NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Eventi Reali (Monitoraggio) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "eventiReali" (
  "id"          SERIAL PRIMARY KEY,
  "userId"      INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "fiumeId"     INTEGER REFERENCES "fiumi"("id") ON DELETE SET NULL,
  "tipo"        VARCHAR(20) NOT NULL,
  "importo"     INTEGER NOT NULL,
  "data"        TIMESTAMP NOT NULL,
  "descrizione" TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Indici utili ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_fiumi_userId"        ON "fiumi"("userId");
CREATE INDEX IF NOT EXISTS "idx_affluenti_fiumeId"   ON "affluenti"("fiumeId");
CREATE INDEX IF NOT EXISTS "idx_affluenti_groupId"   ON "affluenti"("groupId");
CREATE INDEX IF NOT EXISTS "idx_reinvestimenti_orig" ON "reinvestimenti"("fiumeOrigineId");
CREATE INDEX IF NOT EXISTS "idx_notifiche_userId"    ON "notifiche"("userId");
CREATE INDEX IF NOT EXISTS "idx_alertConfig_userId"  ON "alertConfig"("userId");
