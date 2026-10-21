# PROJECTSCOPE 🚀
### Find the Gap Nobody Filled — Before You Build It.

**ProjectScope** is an AI-powered hackathon research and project ideation platform that helps developers, students, and innovators discover existing projects, identify unexplored problem areas, and develop original, evidence-backed project ideas.

Instead of brainstorming blindly, ProjectScope helps you understand what has already been built, where existing solutions fall short, and how your next project can offer something different.

It combines web research, AI-powered analysis, project comparison, and structured proposal generation in one workspace.

---

## 📌 Table of Contents

- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [Two Ways to Discover Ideas](#-two-ways-to-discover-ideas)
- [AI-Powered Analysis](#-ai-powered-analysis)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Demo Mode](#-demo-mode)
- [Deploying to Vercel](#-deploying-to-vercel)
- [Available Commands](#-available-commands)
- [API Overview](#-api-overview)
- [Project Structure](#-project-structure)
- [Testing and Quality Checks](#-testing-and-quality-checks)
- [Responsible Research and AI Transparency](#-responsible-research-and-ai-transparency)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 The Problem

Hackathons encourage participants to solve real-world problems within limited timeframes. However, one of the biggest challenges is deciding **what to build in the first place**.

Many teams start with an exciting idea only to discover that similar applications already exist, previous hackathon teams have built comparable solutions, or an earlier winning project has already addressed the same problem.

Traditional brainstorming and general-purpose AI tools may generate appealing ideas without adequately checking whether those ideas are genuinely different from existing solutions.

This creates several challenges:

- **Idea duplication:** Teams may unknowingly build projects similar to existing submissions.
- **Limited research time:** Manually exploring previous projects, competitions, and technologies can take considerable effort.
- **Unclear problem gaps:** It can be difficult to identify what existing solutions fail to address.
- **Unverified AI claims:** Generated ideas may include unsupported claims about originality, impact, or market demand.
- **Difficulty evaluating ideas:** Teams need a practical way to compare feasibility, originality, impact, and technical complexity.

The result is wasted research time and less opportunity to build something meaningfully different.

## 💡 Our Solution

ProjectScope addresses this challenge by placing research before ideation.

It gathers information from permitted sources, organizes relevant findings, analyzes existing projects, identifies recurring approaches and potential gaps, and uses AI to help develop new project concepts.

Rather than simply asking an AI model to suggest an idea, ProjectScope attempts to answer three important questions:

1. **What already exists?** Discover relevant projects, solutions, and previous work.
2. **What is missing?** Analyze common approaches, limitations, and potentially underserved needs.
3. **What could we build differently?** Generate and evaluate project concepts using research-backed reasoning.

The platform offers two workflows: a free-choice mode for users who need inspiration and a topic-driven mode for users who already have a problem or domain in mind.

The goal is to help teams make more informed decisions before committing their limited hackathon time.

---

## ✨ Key Features

### 1. AI-Powered Project Discovery

Search for relevant projects and existing solutions using information gathered from supported research sources.

ProjectScope organizes the collected information into a consistent format so that users can explore and compare projects more easily.

### 2. Two Project Ideation Modes

Choose between discovering ideas from scratch and researching a specific topic.

- **Free-choice discovery:** Get ranked project concepts across multiple domains.
- **Topic-driven research:** Investigate a particular problem, theme, target audience, or technology area.

### 3. Market-Gap Analysis

Use AI-assisted analysis to identify recurring approaches, potential weaknesses, underserved users, and opportunities for improvement.

The resulting report helps users understand where a proposed solution might offer additional value.

### 4. Original Idea Studio

Generate project concepts informed by the existing projects and research collected during a run.

Ideas are compared against retrieved work, helping users identify similarities and think about meaningful differentiation.

### 5. Evidence-Based Idea Scoring

Evaluate free-choice concepts across five dimensions:

| Evaluation Criterion | What It Measures |
|---|---|
| Feasibility | Whether a small team can build a demonstrable solution during a hackathon |
| Originality | How different the concept is from the projects discovered |
| Real-world impact | The potential value of solving the identified problem |
| Technical ambition | The level of technical challenge involved |
| Live-demo potential | How effectively the project can be demonstrated in a short presentation |

Each dimension is scored from 0 to 10, giving a maximum total of 50 points.

Scores include written reasoning to make the evaluation easier to understand. They are decision-support estimates, not guarantees of success or originality.

### 6. Project Comparison Workspace

Compare existing projects and approaches to understand their similarities and differences.

This makes it easier to identify common features, explore alternative approaches, and determine how a proposed solution could stand apart.

### 7. AI-Generated Project Proposals

Turn a promising concept into a more structured proposal.

Depending on the workflow, generated outputs can explain the recommended idea, supporting evidence, differentiation, implementation direction, and proposed validation experiments.

### 8. Pitch Studio

Organize a project concept into a clearer pitch that communicates the problem, proposed solution, and potential value.

This helps teams prepare to explain their ideas to judges, mentors, and collaborators.

### 9. Live Research Progress

Track research progress while a run is being processed.

ProjectScope uses Server-Sent Events (SSE) to stream progress updates, with support for resuming event streams.

### 10. Saved Research and Exports

Keep useful research, projects, and results accessible within the application.

The platform also supports exporting research outputs in Markdown or JSON for further editing, documentation, and collaboration.

### 11. Demo Mode

Explore the application's workflows using a bundled sample dataset without configuring external AI provider credentials.

Demo content is explicitly labelled so that sample records are not confused with live research.

### 12. Resilient Research Workflow

If a permitted source or external provider fails, the application can report the issue and continue with successfully retrieved information where possible.

The interface is designed to show the results actually collected and the sources checked, rather than claiming that every possible project has been discovered.

---

## ⚙️ How It Works

ProjectScope follows a multi-stage research and ideation workflow.

### Stage 1: Discover Existing Work

The application searches permitted sources for relevant projects, previous hackathon submissions, technologies, and problem areas.

The discovery process depends on the selected workflow and the sources available for the query.

### Stage 2: Normalize the Research

Retrieved information can come in different formats. ProjectScope uses AI-assisted normalization to organize relevant records into a consistent structure.

Source links, attribution, and retrieval timestamps are retained where available.

### Stage 3: Store and Organize Findings

Research records and run information are stored using Prisma and SQLite.

This allows the application to retrieve projects, associate results with research runs, and support subsequent analysis.

### Stage 4: Analyze Existing Solutions

AI-assisted analysis looks for recurring approaches, potential weaknesses, similarities, and areas that may deserve further investigation.

These findings help users move beyond a list of search results toward a clearer understanding of the problem space.

### Stage 5: Generate and Evaluate Concepts

The free-choice workflow produces five ranked concepts across five domains. Each concept is evaluated using the project's scoring criteria.

In topic-driven mode, the system analyzes the researched topic and organizes related projects into groups or clusters before developing concepts.

### Stage 6: Recommend a Direction

ProjectScope presents ideas alongside supporting information and explanations to help users decide which direction to investigate further.

### Stage 7: Build a Proposal and Pitch

The selected concept can be developed into a structured project proposal or pitch.

Users can then validate the assumptions, refine the solution, and decide what to implement.

---

## 🔍 Two Ways to Discover Ideas

### Mode 1: Free-Choice Discovery

**Best for:** Students, developers, and teams who have not decided what to build yet.

The user can begin without entering a specific topic. Optional information includes interests, preferred technologies, team capabilities, and project constraints.

The workflow:

1. Discover potential problems and existing projects.
2. Normalize and store the research.
3. Analyze recurring patterns and possible gaps.
4. Generate five concepts across five domains.
5. Score and rank the concepts.
6. Recommend a direction and create a project proposal.

**Output:** Ranked project concepts, supporting research, a recommended idea, and a structured proposal.

### Mode 2: Topic-Driven Research

**Best for:** Teams that already have a theme, problem statement, target audience, or technical domain.

Users can configure their research with details such as:

- Topic or problem statement
- Domain or technology area
- Target users
- Geographic focus
- Research sources
- Maximum number of results

The workflow:

1. Validate the research request.
2. Search supported sources.
3. Remove duplicate findings and normalize records.
4. Store the collected information.
5. Analyze the existing project landscape.
6. Group related approaches into clusters.
7. Develop project concepts and supporting reports.

**Output:** A project explorer, market-gap report, comparison workspace, project concepts, and pitch-related material.

Both modes use the same general principles of source attribution, transparent limitations, and responsible AI-assisted analysis.

---

## 🧠 AI-Powered Analysis

ProjectScope uses different AI and research providers for specialized tasks rather than relying on a single model for the entire workflow.

| Component | Responsibility |
|---|---|
| TinyFish | Discovers candidate projects and retrieves information from permitted sources |
| OpenAI | Normalizes research records, compares ideas, clusters approaches, scores concepts, and helps generate proposals and pitches |
| Google Gemini | Supports market-gap analysis and free-choice discovery analysis, including grounded research where supported |

### Why Separate Providers?

Separating provider integrations makes the application easier to maintain and extend.

For example, the discovery provider can be changed without rewriting the components responsible for scoring ideas or generating proposals.

The provider integrations are organized in dedicated files under `src/lib/providers/`.

### AI Transparency

ProjectScope is designed to distinguish research evidence from AI-generated reasoning.

- Factual claims should link to their supporting sources.
- Unsupported conclusions should be identified as hypotheses.
- Awards and rankings should not be invented.
- Similarity warnings help identify concepts that closely resemble retrieved projects.
- Proposed validation experiments help users investigate assumptions instead of treating them as proven facts.

AI-generated analysis is a starting point for investigation, not a substitute for independent verification.

---

## 🛠️ Technology Stack

ProjectScope combines a modern web application framework, structured data validation, persistent storage, and AI integrations.

| Technology | Purpose |
|---|---|
| Next.js 16 | Application framework, pages, and server-side route handlers |
| React 19 | Interactive user interface |
| TypeScript 5 | Type-safe application development |
| Tailwind CSS v4 | Styling and responsive layouts |
| Neo-Brutalist UI system | Distinctive visual design and interface components |
| Lenis | Smooth scrolling |
| Prisma 7 | Database access and data modeling |
| SQLite / libSQL | Relational database — a local file in development, hosted Turso in production |
| `@prisma/adapter-libsql` | Driver adapter for both backends (local file and hosted) |
| `@libsql/client` | The SQLite client: local `file:` and remote HTTP dialects |
| Zod v4 | Input validation and structured data validation |
| Server-Sent Events | Live research progress updates |
| Next.js `after()` | Keeps background research jobs alive on a serverless platform |
| TinyFish SDK | Search and permitted page retrieval |
| OpenAI SDK | Structured AI outputs and project analysis |
| Google GenAI SDK | Grounded analysis and market-gap research |
| Vitest | Unit and integration testing |
| ESLint | Code quality and linting |

---

## 🏗️ System Architecture

The application can be understood as five cooperating layers.

```text
┌───────────────────────────────────────┐
│             USER INTERFACE            │
│   Next.js · React · Tailwind CSS       │
│                                       │
│ Discovery · Research · Compare        │
│ Reports · Ideas · Pitch · Saved       │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│          APPLICATION API              │
│     Next.js server-side routes        │
│                                       │
│ Validation · Run management · Exports │
└───────────────┬───────────┬───────────┘
                │           │
                ▼           ▼
┌────────────────────┐  ┌────────────────────┐
│ RESEARCH PROVIDERS  │  │   AI PROVIDERS     │
│                    │  │                    │
│ TinyFish Search    │  │ OpenAI             │
│ Permitted Fetch    │  │ Google Gemini      │
└──────────┬─────────┘  └──────────┬─────────┘
           │                       │
           └───────────┬───────────┘
                       ▼
┌───────────────────────────────────────┐
│          RESEARCH PIPELINES           │
│                                       │
│ Collect · Normalize · Analyze         │
│ Cluster · Compare · Score · Propose   │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│          DATA AND PERSISTENCE         │
│                                       │
│          Prisma + SQLite              │
│       Research runs and results       │
└───────────────────────────────────────┘
```

### Architectural Highlights

- **Separation of concerns:** UI, API routes, provider clients, research workflows, and database access have distinct responsibilities.
- **Structured validation:** Zod schemas help validate requests, responses, and AI-generated data.
- **Server-side credentials:** External provider calls are handled on the server, keeping API keys out of browser-facing code.
- **Persistent progress:** Research events can be stored and streamed to the interface.
- **Replaceable providers:** Dedicated provider modules make integrations easier to maintain.
- **Isolated testing:** Integration tests use a separate test database.

---

## 🚀 Getting Started

Follow these steps to run ProjectScope locally.

### Prerequisites

Install the following:

- [Node.js](https://nodejs.org/) compatible with the project's Next.js requirements
- npm, which comes with Node.js
- Git
- A terminal such as PowerShell, Command Prompt, or Bash

External API credentials are optional if you want to start in demo mode.

### 1. Clone the Repository

```bash
git clone https://github.com/kkusumk09/CYBERCHIX-ProjectScope.git
```

Move into the project directory:

```bash
cd CYBERCHIX-ProjectScope
```

### 2. Install Dependencies

On Windows PowerShell:

```powershell
npm.cmd install
```

On macOS, Linux, or a terminal where npm is available:

```bash
npm install
```

### 3. Configure Environment Variables

Create your local environment file from the provided example.

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS or Linux:

```bash
cp .env.example .env.local
```

You can leave the provider keys unconfigured for demo mode, or add your own credentials to enable live research.

See [Environment Configuration](#-environment-configuration) below.

### 4. Set Up the Database

Run the Prisma migrations and generate the Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

If you use Windows PowerShell and encounter command execution restrictions, use `npx.cmd` instead:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
```

### 5. Load the Sample Dataset (Optional)

To populate the application with example research runs and project records:

```bash
npx prisma db seed
```

On Windows PowerShell:

```powershell
npx.cmd prisma db seed
```

This step is optional, but useful when exploring the application's interface in demo mode.

### 6. Start the Development Server

```bash
npm run dev
```

On Windows PowerShell:

```powershell
npm.cmd run dev
```

### 7. Open the Application

Visit the following address in your browser:

**http://localhost:3000**

You can now explore the ProjectScope interface.

---

## 🔐 Environment Configuration

ProjectScope reads its external provider credentials on the server.

Add the relevant values to `.env.local`. Never commit real credentials to GitHub.

### Required for Live Research

| Variable | Purpose |
|---|---|
| `TINYFISH_API_KEY` | Enables project discovery and permitted source retrieval |
| `OPENAI_API_KEY` | Enables research normalization, comparisons, scoring, and proposal generation |
| `GEMINI_API_KEY` | Enables Gemini-powered analysis and grounded research where supported |
| `DATABASE_URL` | Points at the database. **Required in production** — see [Deploying to Vercel](#-deploying-to-vercel) |

Obtain credentials from the providers' official websites:

- [TinyFish](https://agent.tinyfish.ai/api-keys)
- [OpenAI](https://platform.openai.com/api-keys)
- [Google AI Studio](https://aistudio.google.com/apikey)

### Optional Configuration

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_MODEL` | `gpt-6.1-sol` | Selects the configured OpenAI model |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Selects the configured Gemini model |
| `TURSO_AUTH_TOKEN` | Unset | Auth token for a hosted libSQL/Turso database |
| `DEMO_MODE` | Unset | Set to `true` to force demo mode |
| `MAX_RESULTS_LIMIT` | `40` | Sets the maximum number of records collected per run |
| `PROVIDER_TIMEOUT_MS` | `45000` | Sets the timeout for external provider calls |

The model defaults shown above come from the repository configuration. Confirm that your chosen provider account supports the configured model names before running live workflows.

### Database Configuration

ProjectScope speaks the SQLite dialect, and the same Prisma schema and the same
migrations work against both supported backends.

| `DATABASE_URL` | Backend | When |
|---|---|---|
| `file:./dev.db` | A local SQLite file | Local development |
| `libsql://<db>.turso.io` | Hosted libSQL (Turso) | Production, including Vercel |

The driver is chosen automatically from the URL scheme in `src/lib/sqlite-adapter.ts`.
One adapter handles both: `@libsql/client` speaks the local `file:` dialect and
the remote HTTP dialect, so the application never loads a second native module.
The one it does load is built against NAPI, so it keeps working when the Node
version changes — unlike a V8-ABI-specific build.

No schema change and no separate migration set is needed to move between them.

### Example `.env.local`

```dotenv
TINYFISH_API_KEY=your_tinyfish_api_key
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# Optional
DEMO_MODE=true
MAX_RESULTS_LIMIT=40
PROVIDER_TIMEOUT_MS=45000
```

Replace placeholder values with your own credentials. If you are exploring demo mode, you can leave the credentials blank and set `DEMO_MODE=true`.

**Security note:** Do not place private credentials in client-side variables such as `NEXT_PUBLIC_*`. Do not commit `.env.local` or share your API keys in screenshots, issues, or public messages.

---

## 🧪 Demo Mode

ProjectScope includes a bundled sample dataset so that users can explore its main workflows without making live research requests.

Demo mode is useful for:

- Exploring the interface before configuring API credentials.
- Understanding how research runs and project records are displayed.
- Examining example market-gap reports and project concepts.
- Testing the application's main navigation and workflows.
- Demonstrating the product without depending on external provider availability.

The sample dataset includes two example research runs:

1. A topic-driven run with sample projects, a market-gap report, experiments, a concept, and a pitch.
2. A free-choice run with ranked concepts and a sample project proposal.

Demo records are labelled as synthetic sample data. They must not be treated as actual competition results, verified awards, or evidence of real market demand.

---

## 🚀 Deploying to Vercel

The application is a standard Next.js App Router project, so Vercel needs no special
framework configuration. Two things do need attention: the **database** and the
**long-running background jobs**.

### 1. The database has to be hosted

Vercel's serverless filesystem is read-only and ephemeral. A local SQLite file
cannot hold data between requests, so a hosted database is required.

The supported choice is **[Turso](https://turso.tech)** (libSQL), which speaks the
same SQLite dialect. The Prisma schema and the migrations are identical for the
local file and for Turso — only the connection URL changes.

```bash
# Create a free database and get a token
npm install -g @turso/cli
turso db create projectscope
turso db tokens create --type client
```

Add the credentials to the Vercel project under **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `libsql://<your-database>.turso.io` |
| `TURSO_AUTH_TOKEN` | The token from `turso db tokens create` |
| `TINYFISH_API_KEY` | Your TinyFish key (optional — without it the app runs in demo mode) |
| `OPENAI_API_KEY` | Your OpenAI key (optional) |
| `GEMINI_API_KEY` | Your Gemini key (optional) |

Apply the migrations to the hosted database once, from your machine:

```bash
$env:DATABASE_URL = "libsql://<your-database>.turso.io"
$env:TURSO_AUTH_TOKEN = "<your-token>"
npm run db:deploy:hosted
```

> `npx prisma migrate deploy` does **not** work here — the Prisma schema engine
> rejects a `libsql://` connection string with P1013. Use
> `npm run db:deploy:hosted`, which applies the same migration files through
> the libSQL client. See [How the migrations reach a hosted database](#how-the-migrations-reach-a-hosted-database).

### 2. Import the project

```bash
npx vercel link
npx vercel env pull .env.local
npx vercel deploy --prod
```

Or connect the GitHub repository in the Vercel dashboard and push. The build
command is already pinned in `vercel.json`:

```
npm run vercel-build
```

which runs, in order:

1. `npm run check:env` — fails the build with an actionable message if
   `DATABASE_URL` is missing or still points at a local file. A deployment that
   cannot store data is worse than a failed deployment.
2. `npm run db:deploy:hosted` — applies any pending migrations to the hosted
   database (see below).
3. `prisma generate` — builds the Prisma client (its output is git-ignored).
4. `next build`.

#### How the migrations reach a hosted database

This needs a word of explanation, because it is not what you might expect.

**The Prisma schema engine only accepts `file:` connection strings.** Pointed at
a Turso database it fails with:

```
Error: P1013: The provided database string is invalid. The scheme is not
recognized in database URL.
```

Prisma's own documentation says the same thing for Turso: schema changes go
through `prisma migrate diff` plus the Turso CLI. Neither of those is
available inside a Vercel build, and `migrate diff` only *generates* SQL — it
does not apply it.

The migrations in `prisma/migrations/` are plain SQLite, and libSQL **is**
SQLite, so the same SQL runs unchanged over the wire. `scripts/migrate-libsql.mjs`
therefore applies them directly with `@libsql/client` — the same library the
runtime adapter uses. It keeps its own bookkeeping table, so a re-deploy
applies nothing and never double-applies a migration.

```bash
# The same command works locally and on Vercel.
npm run db:deploy:hosted
```

It dispatches on the URL scheme:

| `DATABASE_URL` | What runs |
|---|---|
| `file:./dev.db` | `prisma migrate deploy` — the Prisma CLI, as usual |
| `libsql://…` | `scripts/migrate-libsql.mjs` — the libSQL runner |

The migration files stay the single source of truth: a migration written with
`prisma migrate dev` is picked up by both paths.


### 3. Background jobs and long requests

A research run takes minutes: it searches several sources, then calls two models.
Two mechanisms keep that working on a serverless platform:

- **`after()`** (`src/lib/background.ts`) — the pipeline is started with
  `after()`, so the platform keeps the invocation alive after the response has
  been returned. A plain fire-and-forget promise would be frozen the moment the
  response was sent, and the run would never finish.
- **`maxDuration = 300`** — every route that calls a provider or holds the
  progress stream open declares this, so the function is not cut off at the
  default budget.

The browser follows the run over Server-Sent Events and falls back to polling,
so progress is shown even if a connection is dropped.

### 4. Optional: load the sample dataset

To give a fresh deployment something to show, load the bundled demo data. The
seed refuses to run against a database that already holds research runs, so it
can never overwrite real work:

```bash
npx prisma db seed
```

To wipe and reseed deliberately:

```bash
npx prisma db seed -- --force
```

### 5. Verify the deployment

```bash
curl https://<your-deployment>.vercel.app/api/health
```

The response reports the provider status **and** whether the database actually
answers. A healthy deployment looks like this:

```json
{
  "ok": true,
  "demoMode": false,
  "database": { "ok": true, "kind": "libsql" },
  "providers": [
    { "name": "tinyfish", "configured": true, "model": null },
    { "name": "openai", "configured": true, "model": "gpt-6.1-sol" },
    { "name": "gemini", "configured": true, "model": "gemini-3.8-flash" }
  ]
}
```

If `database.ok` is `false`, the `DATABASE_URL` or the auth token is wrong.

### 6. Install scripts

npm 11.19 and newer only run a dependency's install scripts when they are
approved. The `allowScripts` field in `package.json` lists the ones this
project needs — the Prisma packages have to place their engines, and the build
tooling has to fetch its binaries.

```json
"allowScripts": {
  "prisma": true,
  "@prisma/engines": true,
  "esbuild": true,
  "unrs-resolver": true,
  "protobufjs": true,
  "@google/genai": true
}
```

The names are unpinned on purpose, so an upgraded dependency stays approved.
`.npmrc` sets `allow-scripts-pin=false` so `npm approve-scripts` keeps writing
name-only entries.

The root `postinstall` script runs `prisma generate`, so the Prisma client is
built right after `npm install` — including on Vercel, where the generated
output is git-ignored.

### Deploying somewhere else

The application is not tied to Vercel. On a long-lived Node server:

```bash
npm run build
npm start
```

`after()` is fully supported by `next start`, and a local SQLite file is fine
there. Set `DATABASE_URL=file:./dev.db` and run `npx prisma migrate deploy`
once.

---

## 💻 Available Commands

The following commands are useful during development.

| Command | Description |
|---|---|
| `npm run dev` | Starts the local development server |
| `npm run typecheck` | Checks TypeScript types without emitting compiled files |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs the Vitest test suite |
| `npm run build` | Creates a production build |
| `npm run check:env` | Validates the production configuration |
| `npm run vercel-build` | The production build used by Vercel |
| `npx prisma generate` | Generates the Prisma client |
| `npx prisma migrate deploy` | Applies existing database migrations |
| `npx prisma db seed` | Loads the sample dataset |

On Windows PowerShell, prefix npm and npx commands with `.cmd` if execution policy restrictions prevent them from running.

---

## 🔌 API Overview

ProjectScope exposes server-side API routes for research, discovery, project management, analysis, and exports.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/research` | Starts topic-driven research |
| `GET` | `/api/research` | Lists research runs |
| `GET` | `/api/research/[jobId]` | Retrieves run status and source information |
| `GET` | `/api/research/[jobId]/events` | Streams research progress using SSE |
| `POST` | `/api/research/[jobId]/cancel` | Cancels a research run |
| `POST` | `/api/research/[jobId]/import` | Imports information manually |
| `POST` | `/api/research/[jobId]/bookmark` | Saves or unsaves a research run |
| `POST` | `/api/discover` | Starts free-choice discovery |
| `GET` | `/api/discover?discoveryId=` | Retrieves a discovery run |
| `POST` | `/api/discover/[discoveryId]/proposal` | Generates a proposal or regenerates concepts |
| `GET` | `/api/projects` | Lists and filters projects |
| `GET` | `/api/projects/[id]` | Retrieves a project's details and attribution |
| `POST` | `/api/projects/save` | Saves a project |
| `GET`, `POST` | `/api/analysis` | Reads or generates market-gap analysis |
| `GET`, `POST` | `/api/concepts` | Reads or generates concepts |
| `GET`, `POST` | `/api/pitch` | Reads or generates pitch material |
| `PUT` | `/api/pitch` | Saves a hand-edited pitch |
| `POST` | `/api/compare` | Compares project approaches |
| `POST` | `/api/export` | Exports results in Markdown or JSON |
| `GET` | `/api/health` | Reports provider configuration and database status |

Every route validates its input with Zod and returns errors in one shape:

```json
{ "error": { "code": "validation_error", "message": "…", "details": "…" } }
```

These endpoints are intended for application workflows. Consult the corresponding route handlers and schemas in `src/app/api/` before integrating external clients.

---

## 📂 Project Structure

The repository is organized to keep the interface, business logic, provider integrations, and data layer separate.

```text
CYBERCHIX-ProjectScope/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── scripts/
│   ├── check-production-env.mjs   # Fails a production build that cannot work
│   ├── migrate.mjs                # Picks the right migration path
│   └── migrate-libsql.mjs         # Applies migrations to a hosted database
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── discover/
│   │   ├── research/
│   │   ├── projects/
│   │   ├── compare/
│   │   ├── report/
│   │   ├── ideas/
│   │   ├── pitch/
│   │   ├── saved/
│   │   └── api/
│   ├── components/
│   │   ├── ui.tsx
│   │   ├── app-shell.tsx
│   │   ├── discovery-studio.tsx
│   │   ├── live-research.tsx
│   │   ├── project-card.tsx
│   │   ├── compare-workspace.tsx
│   │   ├── idea-studio.tsx
│   │   ├── pitch-studio.tsx
│   │   ├── report-generator.tsx
│   │   ├── toggle-buttons.tsx
│   │   └── export-buttons.tsx
│   └── lib/
│       ├── providers/
│       │   ├── tinyfish.ts
│       │   ├── openai.ts
│       │   └── gemini.ts
│       ├── research/
│       │   ├── collect.ts
│       │   ├── pipeline.ts
│       │   ├── discovery.ts
│       │   ├── analysis.ts
│       │   ├── events.ts
│       │   ├── sources.ts
│       │   └── demo.ts
│       ├── ai-schemas.ts
│       ├── schema.ts
│       ├── api.ts
│       ├── background.ts        # `after()` wrapper for background jobs
│       ├── db.ts
│       ├── sqlite-adapter.ts    # Picks the SQLite or libSQL driver
│       ├── database-url.ts
│       ├── env.ts
│       ├── errors.ts
│       └── products.ts
├── tests/
├── .env.example
├── package.json
├── prisma.config.ts
├── vercel.json
├── vitest.config.mts
└── README.md
```

### Important Directories

- **`src/app/`** — Application pages, research views, project exploration, and API routes.
- **`src/components/`** — Reusable interface components and interactive workspaces.
- **`src/lib/providers/`** — Integrations with TinyFish, OpenAI, and Google Gemini.
- **`src/lib/research/`** — Research collection, processing pipelines, progress events, source policies, and demo data.
- **`prisma/`** — Database schema, migrations, and sample-data seeding.
- **`tests/`** — Automated unit and integration tests.

---

## ✅ Testing and Quality Checks

ProjectScope includes automated checks to help keep the codebase reliable.

Run the following commands before submitting changes:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The test suite covers areas such as:

- Request and response validation.
- Validation of structured AI output.
- Research-source restrictions.
- Query construction for both research workflows.
- Secret redaction and provider error handling.
- Provider client behavior under mocked success and failure conditions.
- Integration tests for both research pipelines using an isolated test database.

The test suite is designed to avoid using development data or making real provider network calls during its isolated integration tests.

---

## 🛡️ Responsible Research and AI Transparency

Responsible source usage is a core part of ProjectScope's design.

### Respecting Source Restrictions

Different websites have different rules about how their content can be accessed. ProjectScope applies source-specific restrictions.

- **Devpost:** Uses search-result metadata and outbound links rather than automatically retrieving project pages. Manual import provides an alternative.
- **Unstop:** Restricts retrieval to permitted paths and avoids disallowed profile, API, and registration paths.
- **Hacker News:** Uses its public Algolia API and links back to original discussions.
- **Other websites:** Uses search and retrieval only where permitted by the configured source policy.

The application is designed to avoid login bypasses, CAPTCHA solving, access-control circumvention, and rate-limit evasion.

### Evidence Before Claims

ProjectScope aims to keep the research process transparent:

- Source attribution is retained with collected information.
- Reports link factual claims to available evidence.
- Unsupported statements are treated as hypotheses.
- Similarity warnings help identify potentially repetitive concepts.
- Research coverage is limited to the records and sources actually checked.
- Generated proposals include attribution to the public projects that informed the research.

### Important Limitations

ProjectScope cannot guarantee that every relevant project has been discovered or that a generated idea is completely original.

Search coverage may vary by source, query, provider availability, and access restrictions. AI-generated scores and market-gap analyses can also be incomplete or incorrect.

Users should verify important claims, investigate original sources, respect project licenses, and conduct their own validation before making decisions.

---

## 🔮 Future Improvements

Potential directions for future development include:

- **Expanded source integrations:** Add more permitted research sources to broaden project discovery.
- **Improved similarity analysis:** Explore more detailed comparisons between proposed concepts and existing implementations.
- **Collaborative research:** Enable teams to organize and discuss findings together.
- **Personalized recommendations:** Refine idea ranking using team skills, time constraints, interests, and available resources.
- **Richer exports:** Offer additional report formats and more customizable project documentation.
- **Research quality indicators:** Make source coverage, evidence strength, and uncertainty easier to interpret.
- **Enhanced validation workflows:** Help users turn assumptions into concrete experiments and measurable acceptance criteria.

These are proposed improvements rather than claims about features already implemented.

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome.

To contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the type checker, linter, tests, and production build.
5. Commit and push your changes.
6. Open a pull request describing what changed and why.

Example commands:

```bash
git checkout -b feature/your-feature-name

git add .

git commit -m "Add: describe your change"

git push origin feature/your-feature-name
```

Then open a pull request from your branch to the main repository.

For larger changes, consider opening an issue first to discuss the proposed implementation.

---

## 📄 License

ProjectScope is distributed under the **MIT License**.

See the repository's license information for the applicable terms.

The bundled demo dataset is synthetic. Public projects discovered during live research belong to their respective creators. Always preserve attribution and respect the applicable licenses and usage terms.

---

## 🌟 Support the Project

If ProjectScope helps you explore an idea, improve your research workflow, or prepare for a hackathon, consider giving the repository a star.

Explore the code, share feedback, and contribute improvements that help more teams build useful and genuinely differentiated solutions.

**ProjectScope — Research smarter. Identify the gap. Build with purpose.**

[View the GitHub Repository](https://github.com/NNemesis16/Kritikal-Hacks)
