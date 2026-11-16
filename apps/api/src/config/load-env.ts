import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

/**
 * Load .env before Nest evaluates module decorators (multer limits read env at import).
 * Existing process environment always wins.
 */
const candidates = [
  process.env.ENV_FILE,
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../../.env"),
].filter((value): value is string => Boolean(value));

for (const candidate of candidates) {
  if (existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
    break;
  }
}
