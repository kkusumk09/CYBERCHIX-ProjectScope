#!/usr/bin/env node
/**
 * Production configuration check.
 *
 * Run before the production build. It fails the build with an actionable
 * message instead of shipping an application that cannot work.
 *
 * The one hard requirement is a database. A local SQLite file is fine for
 * development, but Vercel's filesystem is read-only and ephemeral, so a file
 * based database cannot hold any data there — every request would either see
 * an empty database or fail to open it at all.
 */

const problems = [];
const notes = [];

/* --- Database ----------------------------------------------------------- */

const databaseUrl = (process.env.DATABASE_URL ?? "").trim();

if (!databaseUrl) {
  problems.push(
    "DATABASE_URL is not set.\n" +
      "        ProjectScope stores every research run, project record and saved item in a database,\n" +
      "        so it cannot run without one.\n" +
      "        For Vercel, create a free Turso (libSQL) database and set:\n" +
      "          DATABASE_URL=libsql://<your-database>.turso.io\n" +
      "          TURSO_AUTH_TOKEN=<your-token>",
  );
} else if (databaseUrl.startsWith("file:")) {
  problems.push(
    "DATABASE_URL points at a local SQLite file ('" +
      databaseUrl +
      "').\n" +
      "        Vercel's filesystem is read-only and ephemeral, so a local file cannot store data\n" +
      "        between requests. Use a hosted libSQL/Turso database instead:\n" +
      "          DATABASE_URL=libsql://<your-database>.turso.io",
  );
} else if (!databaseUrl.startsWith("libsql:")) {
  notes.push(
    `DATABASE_URL uses the '${databaseUrl.split(":")[0]}:' scheme. The bundled Prisma schema is\n` +
      "        written for SQLite/libSQL, so make sure the target database speaks the same dialect.",
  );
}

if (databaseUrl.startsWith("libsql:") && !process.env.TURSO_AUTH_TOKEN) {
  problems.push(
    "TURSO_AUTH_TOKEN is not set, but DATABASE_URL points at a hosted libSQL database.\n" +
      "        The server needs the token to authenticate every request.",
  );
}

/* --- Provider credentials ----------------------------------------------- */

/*
 * Missing provider keys are not an error: the application falls back to a
 * clearly labelled demo mode. It is only worth a note, so nobody is
 * surprised by sample data on a live deployment.
 */
const missingProviders = [
  ["TINYFISH_API_KEY", "TinyFish (web discovery)"],
  ["OPENAI_API_KEY", "OpenAI (normalisation, comparison, scoring)"],
  ["GEMINI_API_KEY", "Gemini (market-gap analysis)"],
]
  .filter(([key]) => !process.env[key])
  .map(([, label]) => label);

if (missingProviders.length > 0) {
  notes.push(
    "No credentials for " +
      missingProviders.join(", ") +
      ".\n" +
      "        The application will run in demo mode and say so on every screen.",
  );
}

/* --- Report -------------------------------------------------------------- */

for (const note of notes) {
  console.warn(`[projectscope] note:\n        ${note}`);
}

if (problems.length > 0) {
  console.error(
    `\n[projectscope] The production configuration is not usable:\n\n` +
      problems.map((problem, index) => `  ${index + 1}. ${problem}`).join("\n\n") +
      `\n\nSee README.md → "Deploying to Vercel" for the full walkthrough.\n`,
  );
  process.exit(1);
}

console.log("[projectscope] Production configuration looks usable.");
