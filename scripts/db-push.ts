/**
 * Applies supabase/schema.sql to the database in DATABASE_URL.
 *
 * The schema is written to be idempotent — it drops and recreates everything —
 * so re-running this is safe and is the intended way to iterate on it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

async function main() {
  const schema = readFileSync(resolve("supabase/schema.sql"), "utf8");
  console.log("Applying supabase/schema.sql ...");
  await sql.unsafe(schema);
  const [{ count }] = await sql<{ count: string }[]>`
    select count(*)::text as count
    from information_schema.tables
    where table_schema = 'public'
  `;
  console.log(`Done. ${count} tables in public schema.`);
  await sql.end();
}

main().catch(async (err) => {
  console.error("Schema push failed:\n", err.message ?? err);
  await sql.end();
  process.exit(1);
});
