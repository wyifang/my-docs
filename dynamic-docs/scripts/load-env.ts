import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadProjectEnv() {
  for (const filename of [".env.local", ".env"]) {
    const envPath = resolve(process.cwd(), filename);
    if (existsSync(envPath)) process.loadEnvFile(envPath);
  }
}
