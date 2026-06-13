# Passmark TestOps

Passmark TestOps is a local-first system for generating QC-ready testcase files with AI, reviewing/editing CSV files, importing them back, and optionally running automation from imported testcases.

<p>
  <a href="./README.vi.md"><strong>Tiếng Việt</strong></a>
  &nbsp;|&nbsp;
  <a href="./README.en.md"><strong>English</strong></a>
</p>

## Goals

- Generate professional QC testcases from natural-language requests.
- Export CSV files that testers can review in Excel or Google Sheets.
- Import edited CSV files and run automation for supported cases.
- Store run history, pass/fail results, result files, and AI explanations.
- Run local AI through Ollama instead of relying on an external API.
- Limit local AI resource usage to avoid exhausting RAM/GPU on deployment machines.

## Main Flow

1. Select `Create testcase file`.
2. Enter the Website URL and testing request.
3. Click `Generate CSV`.
4. AI creates a testcase CSV file.
5. The tester downloads and reviews/edits the CSV.
6. Select `Auto test from file`.
7. Import the edited CSV or use the generated file.
8. Click `Run imported` to run supported automated cases.

## Tech Stack

- Backend: Node.js + TypeScript
- Server: native HTTP server in `src/server.ts`
- Database: PostgreSQL + Prisma
- Frontend: static HTML/CSS/JS in `public/`
- Automation: Playwright Chromium
- Local AI: Ollama native `/api/chat`
- Default model: `qwen2.5-coder:0.5b`

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

- `postgres`: primary database.
- `ollama`: local AI server.
- `ollama-model`: one-time model pull job for `qwen2.5-coder:0.5b`.
- `app`: Passmark TestOps web app.

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

The default model is intentionally small:

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

## Check Ollama

Check installed models:

```powershell
docker exec -it passmark-testops-ollama-1 ollama list
```

Pull the model manually if needed:

```powershell
docker compose run --rm ollama-model
```

Check logs:

```powershell
docker compose logs ollama
docker compose logs ollama-model
```

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

Common error:

```text
Error: listen EADDRINUSE: address already in use :::5000
```

Fix:

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

Or change `PORT` in `.env`.

### Docker Daemon Is Not Running

If Docker engine/pipe errors appear, open Docker Desktop first and run again:

```powershell
docker compose up --build
```

### `ollama-model` Is Stopped

That is expected after the model is pulled. It is a one-time job, not a background service.

### AI Returns Bad JSON Or Too Few Cases

The app has fallback behavior to keep the flow working. With a very small model such as `qwen2.5-coder:0.5b`, quality may be lower than larger models. You can change the model later, but consider RAM/GPU impact first.

### Prisma Needs To Download Binaries

If `npm run db:generate` fails because of network issues, check proxy/internet access or run the app through Docker for a more consistent environment.

## Development Notes

- The frontend must not call AI directly.
- The backend calls Ollama through `src/local-ai-client.ts`.
- Do not hardcode AI URLs, models, or keys in source code.
- Do not allow AI to create destructive, stress, DDoS, or unsafe tests.
- CSV is the main review artifact before automation runs.

