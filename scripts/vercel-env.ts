/**
 * Pushes the variables in .env.local to a linked Vercel project.
 *
 * Run after `vercel login` and `vercel link`. Values are piped to the CLI on
 * stdin rather than passed as arguments, so no secret lands in shell history.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
  "DEMO_PASSWORD",
] as const;

// The chatbot no-ops when unset, so it should never block a deploy that
// doesn't have a Botpress bot configured yet.
const OPTIONAL_KEYS = ["NEXT_PUBLIC_BOTPRESS_INJECT_SRC", "NEXT_PUBLIC_BOTPRESS_CONFIG_SRC"] as const;

const KEYS = [...REQUIRED_KEYS, ...OPTIONAL_KEYS] as const;

const ENVIRONMENTS = ["production", "preview", "development"] as const;

function readEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

function addVar(key: string, value: string, environment: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["node_modules/vercel/dist/index.js", "env", "add", key, environment, "--force"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.stdin.write(value);
    child.stdin.end();
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(stderr.trim().split("\n").slice(-2).join(" "))),
    );
  });
}

async function main() {
  const env = readEnvLocal();
  const missing = REQUIRED_KEYS.filter((k) => !env[k]);
  if (missing.length) {
    console.error(`Missing from .env.local: ${missing.join(", ")}`);
    process.exit(1);
  }

  const present = KEYS.filter((k) => env[k]);
  const skipped = OPTIONAL_KEYS.filter((k) => !env[k]);
  if (skipped.length) console.log(`Skipping unset optional keys: ${skipped.join(", ")}`);

  // DATABASE_URL is deliberately excluded. It is only used by the local seed
  // and schema scripts; the deployed app never opens a raw Postgres connection.
  for (const key of present) {
    for (const environment of ENVIRONMENTS) {
      try {
        await addVar(key, env[key], environment);
        console.log(`  set ${key} (${environment})`);
      } catch (err) {
        console.error(`  FAILED ${key} (${environment}): ${(err as Error).message}`);
      }
    }
  }
  console.log("\nDone. Now run: npm run deploy");
}

main();
