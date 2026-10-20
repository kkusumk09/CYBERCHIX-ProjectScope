import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

/**
 * Prepare an isolated SQLite database for the test run.
 *
 * The test database lives at `prisma/test.db` and is recreated from the
 * migrations every time the suite starts, so tests never touch the
 * development database and never depend on leftover state.
 */
export default function globalSetup() {
  const rootDir = process.cwd();
  const testDbPath = path.join(rootDir, "prisma", "test.db");

  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${testDbPath}${suffix}`;
    if (existsSync(file)) rmSync(file, { force: true });
  }

  // Run the Prisma CLI through Node directly — `npx` is a shell script on
  // Windows and cannot be spawned with execFileSync.
  const prismaCli = path.join(rootDir, "node_modules", "prisma", "build", "index.js");

  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
}
