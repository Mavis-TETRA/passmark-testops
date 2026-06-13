# Passmark TestOps

<p>
  <img alt="Local AI" src="https://img.shields.io/badge/AI-Ollama%20local-111827?style=for-the-badge">
  <img alt="Automation" src="https://img.shields.io/badge/Automation-Playwright-2563eb?style=for-the-badge">
  <img alt="Database" src="https://img.shields.io/badge/Database-PostgreSQL-334155?style=for-the-badge">
  <img alt="QC Files" src="https://img.shields.io/badge/Export-CSV%20%7C%20Excel%20%7C%20Word-16a34a?style=for-the-badge">
</p>

**Passmark TestOps** is a local-first AI TestOps workspace for QC teams: generate QC-ready testcase files, review and edit them outside the app, import CSV back into the system, run Playwright automation, keep run history, attach screenshots, and export final result files.

<p>
  <a href="./README.md"><strong>Language index</strong></a>
  &nbsp;|&nbsp;
  <a href="./README.vi.md"><strong>Tiếng Việt</strong></a>
</p>

## Highlights

| Need | How Passmark TestOps helps |
| --- | --- |
| Write testcases faster while keeping QC structure | AI creates Objective, Step, Expected Result, Priority, Actual Result, Pass/Fail-ready rows |
| Review before automation | Export CSV, Excel-compatible `.xls`, and Word-compatible `.doc` files |
| Keep multiple testing threads inside one project | Projects act as folders; Test Suites act as separate item/thread flows |
| Avoid external AI API dependency | Uses local Ollama with default model `qwen2.5-coder:0.5b` |
| Run on modest deployment machines | Limits RAM/GPU, context, tokens, threads, and loaded model count |
| Preserve failure evidence | Playwright captures screenshots and writes actual results into exported files |

## Product Flow

```mermaid
flowchart LR
  A["Describe what to test"] --> B["AI estimates coverage"]
  B --> C["Generate QC testcase file"]
  C --> D["Download CSV / Excel / Word"]
  D --> E["Tester reviews and edits"]
  E --> F["Import CSV"]
  F --> G["Run automation"]
  G --> H["Write Actual Result, Pass/Fail, Screenshot"]
  H --> I["Export final result files"]
```

## Interface Target

```text
Passmark TestOps
├─ Projects
│  ├─ Website QA
│  │  ├─ Homepage SEO review
│  │  ├─ Elder-user UI check
│  │  └─ Checkout regression
│  └─ Landing Page QA
│     └─ Campaign tracking
│
└─ Current item
   What do you want to test?
   [ https://example.com/                                ]
   [ Describe modules, risks, roles, data, edge cases... ]
   [ Generate testcase file ]

   Run history
   - Testcase file: 40 cases, not automated yet
   - Auto test: 38/40 passed, failure screenshots attached
```

## Two Main Modes

### 1. Create Testcase File

1. Select a project and an item/testing thread.
2. Enter a URL or use a configured target.
3. Describe the testing goal in natural language.
4. AI acts as a QC Lead and estimates the number of required testcases.
5. The backend enforces the configured case count range, with a default minimum of 40 cases.
6. Download CSV/Excel/Word files for tester review and edits.

### 2. Auto Test From File

1. Import an edited CSV or reuse the generated file.
2. The system only runs automation-safe testcase kinds from an allowlist.
3. Playwright runs Chromium and records Actual Result, Pass/Fail, and Defect ID placeholders.
4. On failure, the system captures screenshots for the result artifact.
5. Download the final result bundle as CSV/Excel/Word.

## Architecture

```mermaid
flowchart TB
  UI["Static UI: public/"] --> API["Node.js HTTP API: src/server.ts"]
  API --> DB["PostgreSQL + Prisma"]
  API --> AI["Local Ollama AI"]
  API --> PW["Playwright Chromium"]
  PW --> ART["Result files and screenshots"]
  AI --> ART
  DB --> UI
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Static HTML/CSS/JS in `public/` |
| Backend | Node.js + TypeScript, native HTTP server |
| Database | PostgreSQL + Prisma |
| Local AI | Ollama native `/api/chat` |
| Automation | Playwright Chromium |
| Export | CSV, HTML Office-compatible Excel/Word |
| Runtime | Docker Compose |

## Project Structure

```text
.
|-- public/                  # UI, CSS, i18n
|-- prisma/                  # Prisma schema, migrations, seed
|-- src/
|   |-- server.ts            # API, testcase file flow, run queue
|   |-- local-ai-client.ts   # Ollama/OpenAI-compatible AI client
|   |-- db.ts                # Prisma client and seed helpers
|   |-- seo-cases.ts         # Legacy/sample cases
|   |-- seo-test-plan.ts     # Prompt and fallback planning
|   `-- seo-template-renderer.ts
|-- storage/                 # Runtime storage, postgres/ollama data
|-- tests/                   # Playwright generated tests
|-- docker-compose.yml       # PostgreSQL + Ollama + app
|-- Dockerfile               # App image
|-- .env.example             # Environment sample
`-- README.md                # Language selector
```

## Quick Start With Docker

Requirements:

- Docker Desktop is running.
- The machine has roughly 4 GB RAM available for the Ollama service.

Start everything:

```powershell
docker compose up --build
```

Open the app:

```text
http://localhost:5000
```

Docker Compose runs:

| Service | Role |
| --- | --- |
| `postgres` | Primary database |
| `ollama` | Local AI server |
| `ollama-model` | One-time model pull job for `qwen2.5-coder:0.5b` |
| `app` | Passmark TestOps web app |

> It is normal for `ollama-model` to stop after pulling the model. The long-running containers are `postgres`, `ollama`, and `app`.

## Run App Outside Docker

If you want to run the backend on the host with `npm run web`:

```powershell
docker compose up -d postgres ollama ollama-model
npm install
npm run db:generate
npm run db:migrate:dev
npm run db:seed
npm run web
```

Open:

```text
http://localhost:5000
```

## Environment

Create `.env` from `.env.example`.

```env
PORT=5000
DATABASE_URL=postgresql://passmark:passmark@localhost:5432/passmark
LOCAL_AI_PROVIDER=ollama
LOCAL_AI_BASE_URL=http://localhost:11434
LOCAL_AI_API_KEY=ollama
LOCAL_AI_MODEL=qwen2.5-coder:0.5b
LOCAL_AI_TIMEOUT_MS=120000
LOCAL_AI_MAX_TOKENS=1536
LOCAL_AI_CONTEXT_TOKENS=2048
LOCAL_AI_NUM_THREAD=2
LOCAL_AI_TEMPERATURE=0.2
LOCAL_AI_KEEP_ALIVE=2m
```

When the app runs inside Docker Compose, it uses the internal service URL:

```env
LOCAL_AI_BASE_URL=http://ollama:11434
```

You do not need to set this manually for Docker because `docker-compose.yml` already provides it.

## Local AI Resource Limits

Default model:

```text
qwen2.5-coder:0.5b
```

Low-resource settings:

- `LOCAL_AI_CONTEXT_TOKENS=2048`
- `LOCAL_AI_MAX_TOKENS=1536`
- `LOCAL_AI_NUM_THREAD=2`
- `LOCAL_AI_KEEP_ALIVE=2m`
- `OLLAMA_NUM_PARALLEL=1`
- `OLLAMA_MAX_LOADED_MODELS=1`
- Docker `ollama` has `mem_limit: 4g`
- Docker `ollama` has `cpus: "2.0"`
- NVIDIA GPU is disabled by default with `NVIDIA_VISIBLE_DEVICES=none`

The goal is to keep AI useful for testcase generation without taking over RAM/GPU on the deployment machine.

## Common Scripts

```json
{
  "web": "tsx src/server.ts",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate deploy",
  "db:migrate:dev": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts",
  "test": "playwright test",
  "test:chromium": "playwright test --project=chromium"
}
```

## Troubleshooting

### Port 5000 Is Already In Use

```text
Error: listen EADDRINUSE: address already in use :::5000
```

Find and stop the process:

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

Or change `PORT` in `.env`.

### PostgreSQL Is Not Running

If `npm run web` reports:

```text
Can't reach database server at localhost:5432
```

Start the database:

```powershell
docker compose up -d postgres
```

### `ollama-model` Is Stopped

That is expected after the model is pulled. It is a one-time job, not a background service.

### AI Returns Bad JSON Or Too Few Cases

The app has fallback behavior to keep the flow working. With a very small model such as `qwen2.5-coder:0.5b`, quality may be lower than larger models. You can change the model later, but consider RAM/GPU impact first.

## Development Notes

- The frontend must not call AI directly.
- The backend calls Ollama through `src/local-ai-client.ts`.
- Do not hardcode AI URLs, models, or keys in source code.
- Do not allow AI to create destructive, stress, DDoS, or unsafe tests.
- The QC testcase file is the primary review artifact. CSV is the machine-readable import format before automation runs.
