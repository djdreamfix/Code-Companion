import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Якщо у тебе managed Postgres із вимогою SSL — розкоментуй:
  // ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);
