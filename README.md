# Passmark TestOps - AI Automation Studio

Passmark TestOps là một hệ thống automation test chạy local, giúp QC/Tester tạo và chạy test qua giao diện web thay vì phải tự viết Playwright thủ công.

Ứng dụng mặc định chạy tại:

```text
http://localhost:5000
```

## Mục Đích

Dự án này được xây dựng để:

- Cho QC/Tester tạo project, test suite và chạy automation test qua UI.
- Dùng local AI để hiểu yêu cầu test và tạo test plan dạng JSON.
- Render Playwright test ổn định từ backend template.
- Chạy Chromium test bằng Playwright.
- Lưu project, suite, test case, run history, result, artifact và AI log vào PostgreSQL.
- Hỗ trợ giao diện dashboard tối màu và song ngữ VI/EN.

Điểm quan trọng: với flow SEO Basic hiện tại, AI không được sinh raw TypeScript. AI chỉ trả về test plan JSON, backend validate plan đó rồi render Playwright code từ template ổn định.

## Tech Stack

- Backend: Node.js + TypeScript
- Server: native HTTP server trong `src/server.ts`
- ORM: Prisma
- Database chính: PostgreSQL
- Database cũ legacy: SQLite tại `storage/passmark.db`
- Frontend: static HTML/CSS/JS trong `public/`
- Automation: Playwright
- Browser test chính: Chromium
- Local AI API: OpenAI-compatible chat completions endpoint

## Cấu Trúc Dự Án

```text
.
|-- public/                         # UI static HTML/CSS/JS và i18n
|-- prisma/
|   |-- schema.prisma               # Prisma schema cho PostgreSQL
|   |-- seed.ts                     # Seed dữ liệu mặc định
|   |-- migrations/                 # PostgreSQL migrations
|   `-- legacy-sqlite/              # Migration SQLite cũ để tham chiếu
|-- scripts/
|   `-- generate-seo-test.ts        # Generator legacy/custom Playwright
|-- src/
|   |-- server.ts                   # HTTP server, API, run flow
|   |-- db.ts                       # Prisma client và seed helper
|   |-- local-ai-client.ts          # Client gọi local AI
|   |-- seo-cases.ts                # Danh sách SEO Basic cases
|   |-- seo-test-plan.ts            # Prompt, fallback, validate AI JSON plan
|   `-- seo-template-renderer.ts    # Render Playwright spec từ template
|-- tests/                          # Playwright tests
|-- docker-compose.yml              # PostgreSQL + app
|-- Dockerfile                      # App image dùng Playwright base image
|-- package.json                    # Scripts chính
`-- .env.example                    # Biến môi trường mẫu
```

## Database

Database chính là PostgreSQL qua Prisma.

Schema nằm tại:

```text
prisma/schema.prisma
```

Các model chính:

- `Project`
- `Environment`
- `TestTarget`
- `TestSuite`
- `TestCase`
- `TestRun`
- `TestResult`
- `Artifact`
- `AIRequestLog`

Migration PostgreSQL chính nằm trong:

```text
prisma/migrations/
```

SQLite cũ chỉ giữ để migrate dữ liệu legacy:

```text
prisma/legacy-sqlite/0001_init/migration.sql
```

## Biến Môi Trường

Tạo file `.env` từ `.env.example`:

```env
PORT=5000
DATABASE_URL=postgresql://passmark:passmark@localhost:5432/passmark
LOCAL_AI_BASE_URL=https://your-local-ai-host/v1
LOCAL_AI_API_KEY=your-local-ai-api-key
LOCAL_AI_MODEL=your-local-ai-model
```

Lưu ý:

- `LOCAL_AI_BASE_URL` lấy từ `.env` và chỉ để base `/v1`.
- Không thêm `/chat/completions` vào `LOCAL_AI_BASE_URL`.
- Frontend không gọi AI trực tiếp.
- Backend nối endpoint AI trong `src/local-ai-client.ts`.
- Không commit `.env` thật lên Git.

## Cách Chạy Local Bằng PostgreSQL

Yêu cầu trước khi chạy:

- Node.js 20+
- npm
- Docker Desktop
- Playwright browsers

Chạy PostgreSQL:

```powershell
docker compose up -d postgres
```

Cài dependency và chuẩn bị database:

```powershell
npm install
npm run db:generate
npm run db:migrate:dev
npm run db:seed
```

Chạy web:

```powershell
npm run web
```

Mở trình duyệt:

```text
http://localhost:5000
```

## Cách Chạy Full App Bằng Docker

Chạy cả PostgreSQL và app:

```powershell
docker compose up --build
```

Mở:

```text
http://localhost:5000
```

Trong Docker, app dùng database URL nội bộ:

```env
DATABASE_URL=postgresql://passmark:passmark@postgres:5432/passmark
```

## Nếu Docker Không Chạy Được Trên Windows

Nếu thấy lỗi dạng:

```text
error during connect: this error may indicate that the docker daemon is not running
open //./pipe/docker_engine: The system cannot find the file specified.
```

Nghĩa là Docker Desktop hoặc Docker daemon chưa chạy. Cách xử lý:

```powershell
# Mở Docker Desktop trước và chờ trạng thái Running
docker context use desktop-linux
docker version
docker compose up -d postgres
```

Nếu service Docker Desktop đang tắt, mở PowerShell bằng quyền Administrator:

```powershell
Start-Service com.docker.service
```

Sau đó chạy lại:

```powershell
docker compose up -d postgres
```

## Scripts Quan Trọng

```json
{
  "web": "tsx src/server.ts",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate deploy",
  "db:migrate:dev": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts",
  "db:studio": "prisma studio",
  "db:sqlite:apply": "tsx prisma/apply-sqlite-migration.ts",
  "db:sqlite:migrate-to-postgres:dry-run": "tsx prisma/migrate-sqlite-to-postgres.ts --dry-run",
  "db:sqlite:migrate-to-postgres": "tsx prisma/migrate-sqlite-to-postgres.ts",
  "test": "playwright test",
  "test:chromium": "playwright test --project=chromium",
  "ai:seo": "tsx scripts/generate-seo-test.ts"
}
```

## Flow Chính Của Hệ Thống

1. User tạo hoặc chọn Project.
2. Project có `baseUrl`, environment, test targets và test suites.
3. User chọn Test Suite và Test Target trong Run Center.
4. Nếu target là `web-url`, `local-web` hoặc `api`, hệ thống dùng `target.url`; nếu không chọn target thì fallback về `project.baseUrl`.
5. Target `source-code` lưu `localPath` để dùng cho source scan sau này.
6. User nhập AI request nếu muốn.
7. Backend gọi local AI để tạo test plan JSON.
8. Backend validate JSON.
9. Với suite `seo-basic`, backend render Playwright spec bằng template ổn định.
10. Backend chạy Playwright:

```powershell
npx playwright test <specPath> --project=chromium --reporter=json
```

11. Backend parse result.
12. Backend lưu `targetId` trong `TestRun`, cùng `TestResult`, `Artifact`, `AIRequestLog` vào PostgreSQL.
13. UI hiển thị Latest Result, AI rendered flow và Run History.

## SEO Basic Cases Mặc Định

Seed mặc định gồm 7 case:

- `SEO-001` Page loads successfully
- `SEO-002` Title exists
- `SEO-003` Meta description exists
- `SEO-004` Canonical URL exists
- `SEO-005` Exactly one H1 exists
- `SEO-006` HTML lang exists
- `SEO-007` Viewport meta exists

Các case này được định nghĩa trong:

```text
src/seo-cases.ts
```

## Nguyên Tắc AI Cho SEO Basic

Flow đúng hiện tại:

1. AI trả về test plan JSON.
2. Backend validate JSON trong `src/seo-test-plan.ts`.
3. Backend giữ các SEO cases đang enabled trong selected suite.
4. Nếu AI lỗi hoặc JSON sai, backend fallback về default SEO plan.
5. Backend render code bằng `src/seo-template-renderer.ts`.
6. Playwright chạy spec đã render.

Không nên làm:

- Không để frontend gọi AI trực tiếp.
- Không để AI generate raw TypeScript cho SEO Basic.
- Không bỏ qua bước validate AI JSON.
- Không quay lại SQLite cho flow chính.

## API Hiện Có

Giữ format response hiện tại nếu phát triển tiếp.

### Projects

```http
GET    /api/projects
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id
```

### Test Suites

```http
GET    /api/test-suites?projectId=...
POST   /api/test-suites
PUT    /api/test-suites/:id
DELETE /api/test-suites/:id
```

### Test Targets

```http
GET    /api/test-targets?projectId=...
POST   /api/test-targets
PUT    /api/test-targets/:id
DELETE /api/test-targets/:id
```

Supported target types:

- `web-url`
- `local-web`
- `source-code`
- `api`

### Runs

```http
POST   /api/run
GET    /api/runs
GET    /api/runs/:id
```

### Generate Preview

```http
POST   /api/generate
```

Endpoint này generate spec preview nhưng không chạy Playwright.

## Dữ Liệu Và Artifact

Các dữ liệu runtime local được tạo trong:

```text
storage/
test-results/
playwright-report/
```

Các thư mục này không nên commit lên Git.

`.gitignore` đã ignore:

- `.env`
- `node_modules/`
- `storage/`
- Playwright output
- generated spec `tests/generated-seo.spec.ts`
- log/build/cache file

File nên commit:

- `.env.example`
- `prisma/schema.prisma`
- `prisma/migrations/`
- source trong `src/`
- UI trong `public/`
- Dockerfile và `docker-compose.yml`
- `package.json` và `package-lock.json`

## Migrating Legacy SQLite Sang PostgreSQL

SQLite hiện chỉ dùng cho dữ liệu cũ. Nếu có file cũ:

```text
storage/passmark.db
```

Chạy PostgreSQL trước:

```powershell
docker compose up -d postgres
npm run db:migrate:dev
```

Dry run:

```powershell
npm run db:sqlite:migrate-to-postgres:dry-run
```

Migrate thật:

```powershell
npm run db:sqlite:migrate-to-postgres
```

Trỏ tới SQLite file khác:

```powershell
npm run db:sqlite:migrate-to-postgres -- --sqlite D:\path\to\passmark.db
```

Script migrate insert theo thứ tự relation và tránh duplicate, nên chạy lại không tạo trùng dữ liệu.

## Reset Database Local

Dừng app trước, sau đó:

```powershell
docker compose down
Remove-Item -Recurse -Force storage\postgres
docker compose up -d postgres
npm run db:migrate:dev
npm run db:seed
```

## Checklist Kiểm Tra Sau Khi Setup

1. `GET http://localhost:5000/api/projects` trả về project mặc định.
2. UI mở được tại `http://localhost:5000`.
3. Tạo, sửa, xóa project được từ UI.
4. Chọn project thì Website URL tự lấy từ `baseUrl`.
5. Project mới có default environment, Basic SEO suite và SEO cases.
6. `GET /api/test-suites?projectId=...` trả về suites và cases.
7. Run Center chạy được Basic SEO test.
8. Latest Result cập nhật sau khi chạy.
9. Run History hiển thị run đã lưu trong PostgreSQL.
10. Click vào một run xem được case details.
11. Nếu local AI lỗi, fallback SEO plan vẫn render và chạy.

## Ghi Chú Khi Phát Triển Tiếp

- Không đổi tên API nếu không thật sự cần.
- Không để frontend biết hoặc giữ AI key.
- Không gọi AI trực tiếp từ browser.
- Không dùng SQLite làm database chính nữa.
- Giữ `seo-template-renderer` là nguồn tạo Playwright code cho SEO Basic.
- Nếu phát triển multi-user, queue hoặc report nâng cao, tiếp tục dựa trên PostgreSQL.
- Nếu `npm run db:generate` lỗi `EPERM rename` trên Windows, thường là do node process đang giữ Prisma engine. Tắt server/node rồi chạy lại.
