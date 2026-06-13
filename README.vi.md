# Passmark TestOps

<p>
  <img alt="Local AI" src="https://img.shields.io/badge/AI-Ollama%20local-111827?style=for-the-badge">
  <img alt="Automation" src="https://img.shields.io/badge/Automation-Playwright-2563eb?style=for-the-badge">
  <img alt="Database" src="https://img.shields.io/badge/Database-PostgreSQL-334155?style=for-the-badge">
  <img alt="QC Files" src="https://img.shields.io/badge/Export-CSV%20%7C%20Excel%20%7C%20Word-16a34a?style=for-the-badge">
</p>

**Passmark TestOps** là AI TestOps chạy local cho QC/Tester: tạo file testcase chuẩn QC trước, cho tester tải về chỉnh sửa, import lại CSV, chạy automation bằng Playwright, lưu lịch sử, ảnh evidence và xuất file kết quả cuối cùng.

<p>
  <a href="./README.md"><strong>Language index</strong></a>
  &nbsp;|&nbsp;
  <a href="./README.en.md"><strong>English</strong></a>
</p>

## Điểm nổi bật

| Nhu cầu | Passmark TestOps xử lý |
| --- | --- |
| Viết testcase nhanh nhưng vẫn đúng chuẩn QC | AI tạo file testcase theo cấu trúc Objective, Step, Expected Result, Priority, Actual Result, Pass/Fail |
| Tester cần review trước khi chạy auto | Xuất CSV, Excel-compatible `.xls`, Word-compatible `.doc` |
| Một project có nhiều luồng kiểm thử nhỏ | Project là nhóm lớn, Test Suite là từng item/luồng riêng giống thread |
| Không muốn phụ thuộc API AI bên ngoài | Dùng Ollama local với model mặc định `qwen2.5-coder:0.5b` |
| Máy triển khai tài nguyên thấp | Giới hạn RAM/GPU, context, token, thread và số model loaded |
| Cần bằng chứng khi fail | Playwright tự chụp screenshot và ghi actual result vào file kết quả |

## Flow sản phẩm

```mermaid
flowchart LR
  A["Nhập yêu cầu test"] --> B["AI đề xuất số lượng case"]
  B --> C["Sinh file testcase QC"]
  C --> D["Tải CSV / Excel / Word"]
  D --> E["Tester chỉnh sửa"]
  E --> F["Import CSV lại app"]
  F --> G["Chạy auto test"]
  G --> H["Ghi Actual Result, Pass/Fail, Screenshot"]
  H --> I["Xuất file kết quả cuối cùng"]
```

## Giao diện mục tiêu

```text
Passmark TestOps
├─ Projects
│  ├─ Website QA
│  │  ├─ Homepage SEO review
│  │  ├─ UI cho người lớn tuổi
│  │  └─ Checkout regression
│  └─ Landing Page QA
│     └─ Campaign tracking
│
└─ Current item
   Bạn muốn test điều gì?
   [ https://example.com/                                ]
   [ Mô tả module, rủi ro, vai trò user, dữ liệu test... ]
   [ Sinh file testcase ]

   Run history
   - File testcase: 40 cases, chưa chạy auto
   - Auto test: 38/40 đạt, có screenshot fail
```

## Hai trạng thái chính

### 1. Tạo file testcase

1. Chọn project và item/luồng test.
2. Nhập URL hoặc dùng target có sẵn.
3. Mô tả điều muốn kiểm thử bằng ngôn ngữ tự nhiên.
4. AI đóng vai QC Lead để ước lượng số lượng testcase cần thiết.
5. Backend bắt buộc tạo đủ số case theo khoảng cấu hình, mặc định tối thiểu 40 case.
6. Tải file CSV/Excel/Word để tester review và chỉnh sửa.

### 2. Auto test theo file

1. Import CSV đã chỉnh sửa hoặc dùng file vừa tạo.
2. Hệ thống chỉ chạy các testcase thuộc nhóm automation an toàn, có whitelist.
3. Playwright chạy Chromium, ghi Actual Result, Pass/Fail, Defect ID placeholder.
4. Khi fail, hệ thống chụp screenshot để đưa vào file kết quả.
5. Tải kết quả cuối bằng CSV/Excel/Word.

## Kiến trúc

```mermaid
flowchart TB
  UI["Static UI: public/"] --> API["Node.js HTTP API: src/server.ts"]
  API --> DB["PostgreSQL + Prisma"]
  API --> AI["Ollama local AI"]
  API --> PW["Playwright Chromium"]
  PW --> ART["Result files and screenshots"]
  AI --> ART
  DB --> UI
```

## Tech stack

| Layer | Công nghệ |
| --- | --- |
| Frontend | Static HTML/CSS/JS trong `public/` |
| Backend | Node.js + TypeScript, native HTTP server |
| Database | PostgreSQL + Prisma |
| Local AI | Ollama native `/api/chat` |
| Automation | Playwright Chromium |
| Export | CSV, HTML Office-compatible Excel/Word |
| Runtime | Docker Compose |

## Cấu trúc dự án

```text
.
|-- public/                  # UI, CSS, i18n
|-- prisma/                  # Prisma schema, migrations, seed
|-- src/
|   |-- server.ts            # API, testcase file flow, run queue
|   |-- local-ai-client.ts   # Client gọi Ollama/OpenAI-compatible AI
|   |-- db.ts                # Prisma client và seed helper
|   |-- seo-cases.ts         # Case mẫu/legacy
|   |-- seo-test-plan.ts     # Prompt và fallback plan
|   `-- seo-template-renderer.ts
|-- storage/                 # Runtime storage, postgres/ollama data
|-- tests/                   # Playwright generated tests
|-- docker-compose.yml       # PostgreSQL + Ollama + app
|-- Dockerfile               # App image
|-- .env.example             # Mẫu cấu hình môi trường
`-- README.md                # Trang chọn ngôn ngữ
```

## Chạy nhanh bằng Docker

Yêu cầu:

- Docker Desktop đang chạy.
- Máy còn tối thiểu khoảng 4 GB RAM trống cho service Ollama.

Chạy toàn bộ hệ thống:

```powershell
docker compose up --build
```

Mở ứng dụng:

```text
http://localhost:5000
```

Docker Compose sẽ chạy:

| Service | Vai trò |
| --- | --- |
| `postgres` | Database chính |
| `ollama` | Local AI server |
| `ollama-model` | Job pull model `qwen2.5-coder:0.5b`, chạy xong tự dừng |
| `app` | Passmark TestOps web app |

> `ollama-model` dừng sau khi pull model là bình thường. Container cần chạy liên tục là `postgres`, `ollama`, và `app`.

## Chạy app ngoài Docker

Nếu muốn chạy backend bằng `npm run web` trên máy host:

```powershell
docker compose up -d postgres ollama ollama-model
npm install
npm run db:generate
npm run db:migrate:dev
npm run db:seed
npm run web
```

Mở:

```text
http://localhost:5000
```

## Cấu hình môi trường

Tạo file `.env` từ `.env.example`.

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

Khi chạy trong Docker Compose, app dùng URL nội bộ:

```env
LOCAL_AI_BASE_URL=http://ollama:11434
```

Bạn không cần tự đổi giá trị này trong Compose vì đã được cấu hình sẵn trong `docker-compose.yml`.

## Giới hạn tài nguyên AI local

Model mặc định:

```text
qwen2.5-coder:0.5b
```

Cấu hình tiết kiệm tài nguyên:

- `LOCAL_AI_CONTEXT_TOKENS=2048`
- `LOCAL_AI_MAX_TOKENS=1536`
- `LOCAL_AI_NUM_THREAD=2`
- `LOCAL_AI_KEEP_ALIVE=2m`
- `OLLAMA_NUM_PARALLEL=1`
- `OLLAMA_MAX_LOADED_MODELS=1`
- Docker `ollama` có `mem_limit: 4g`
- Docker `ollama` có `cpus: "2.0"`
- GPU NVIDIA tắt mặc định bằng `NVIDIA_VISIBLE_DEVICES=none`

Mục tiêu là AI đủ dùng để tạo testcase nhưng không chiếm quá nhiều RAM/GPU của máy triển khai.

## Lệnh thường dùng

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

### Port 5000 đang bị chiếm

```text
Error: listen EADDRINUSE: address already in use :::5000
```

Kiểm tra và tắt process:

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

Hoặc đổi `PORT` trong `.env`.

### PostgreSQL chưa chạy

Nếu `npm run web` báo:

```text
Can't reach database server at localhost:5432
```

Hãy bật database:

```powershell
docker compose up -d postgres
```

### `ollama-model` không chạy liên tục

Đây là bình thường. Nó là job pull model một lần, không phải service nền.

### AI trả JSON lỗi hoặc thiếu case

Hệ thống có fallback để không làm hỏng flow. Với model nhỏ như `qwen2.5-coder:0.5b`, chất lượng có thể không bằng model lớn. Có thể đổi model sau, nhưng nên cân nhắc RAM/GPU.

## Nguyên tắc phát triển

- Frontend không gọi AI trực tiếp.
- Backend gọi Ollama qua `src/local-ai-client.ts`.
- Không hardcode AI URL, model hoặc key trong source.
- Không cho AI tạo destructive test, stress test, DDoS hoặc hành vi nguy hiểm.
- File testcase QC là artifact chính để tester review; CSV là định dạng máy đọc để import trước khi chạy automation.
