import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schemaObj from "./schema";

// DATABASE_URL should be a Postgres connection string, e.g. from Supabase:
// postgres://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and set it to your Supabase Postgres connection string.");
}

// prepare: false is required for Supabase's transaction pooler (port 6543).
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema: schemaObj });
export const schema = schemaObj;
