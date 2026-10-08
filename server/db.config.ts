import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../drizzle/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  // Serverless: una connessione per istanza (usare il pooler Supabase, porta 6543)
  max: process.env.VERCEL ? 1 : 10,
});
export const db = drizzle(pool, { schema });
