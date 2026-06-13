# Passmark TestOps

Passmark TestOps là hệ thống chạy local giúp QC/Tester tạo file test case bằng AI, chỉnh sửa/import CSV, sau đó có thể chạy automation theo file test case đã tạo hoặc đã import.

<p>
  <a href="./README.vi.md"><strong>Tiếng Việt</strong></a>
  &nbsp;|&nbsp;
  <a href="./README.en.md"><strong>English</strong></a>
</p>

## Mục tiêu

- Tạo test case chuẩn QC từ yêu cầu tự nhiên.
- Xuất file CSV để tester tải về, chỉnh sửa bằng Excel/Google Sheets.
- Import lại CSV để chạy automation theo các case có thể tự động hóa.
- Lưu lịch sử chạy, kết quả pass/fail, file kết quả và giải thích từ AI.
- Chạy AI local bằng Ollama để không phụ thuộc API ngoài.
- Giới hạn tài nguyên AI để tránh chiếm RAM/GPU của máy triển khai.

## Flow chính

1. Chọn `Create testcase file`.
2. Nhập Website URL và mô tả muốn test.
3. Bấm `Generate CSV`.
4. AI tạo danh sách test case dạng CSV.
5. Tester tải file CSV về để review/chỉnh sửa.
6. Chọn `Auto test from file`.
7. Import CSV đã chỉnh sửa hoặc dùng file vừa tạo.
8. Bấm `Run imported` để chạy automation theo các case phù hợp.

## Tech stack

- Backend: Node.js + TypeScript
- Server: native HTTP server trong `src/server.ts`
- Database: PostgreSQL + Prisma
- Frontend: static HTML/CSS/JS trong `public/`
- Automation: Playwright Chromium
- Local AI: Ollama native `/api/chat`
- Model mặc định: `qwen2.5-coder:0.5b`

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
|-- storage/                 # Runtime storage, postgres/ollama data khi chạy local
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

- `postgres`: database chính.
- `ollama`: local AI server.
- `ollama-model`: job pull model `qwen2.5-coder:0.5b`, chạy xong sẽ tự dừng.
- `app`: Passmark TestOps web app.

> `ollama-model` dừng sau khi pull model là bình thường. Container cần chạy liên tục là `postgres`, `ollama`, và `app`.

## Chạy app ngoài Docker

Nếu bạn muốn chạy backend bằng `npm run web` trên máy host:

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

Khi app chạy trong Docker Compose, app dùng URL nội bộ:

```env
LOCAL_AI_BASE_URL=http://ollama:11434
```

Bạn không cần tự đổi giá trị này trong Compose vì đã được cấu hình sẵn trong `docker-compose.yml`.

## Giới hạn tài nguyên AI local

Mặc định dự án dùng model nhỏ:

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
- GPU NVIDIA bị tắt mặc định bằng `NVIDIA_VISIBLE_DEVICES=none`

Mục tiêu là AI đủ dùng để tạo test case nhưng không chiếm quá nhiều RAM/GPU của máy triển khai.

## Kiểm tra Ollama

Kiểm tra model đã có chưa:

```powershell
docker exec -it passmark-testops-ollama-1 ollama list
```

Nếu chưa có model:

```powershell
docker compose run --rm ollama-model
```

Kiểm tra log:

```powershell
docker compose logs ollama
docker compose logs ollama-model
```

## Script thường dùng

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

Lỗi thường gặp:

```text
Error: listen EADDRINUSE: address already in use :::5000
```

Cách xử lý:

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

Hoặc đổi `PORT` trong `.env`.

### Docker daemon chưa chạy

Nếu thấy lỗi Docker engine/pipe, mở Docker Desktop trước rồi chạy lại:

```powershell
docker compose up --build
```

### `ollama-model` không chạy

Đây là bình thường nếu model đã pull xong. Nó là job một lần, không phải service chạy nền.

### AI trả JSON lỗi hoặc thiếu case

Hệ thống có fallback để không làm hỏng flow. Với model rất nhỏ như `qwen2.5-coder:0.5b`, chất lượng có thể không bằng model lớn. Nếu cần tăng chất lượng, có thể đổi model nhưng nên cân nhắc RAM/GPU.

### Prisma cần tải binary

Nếu `npm run db:generate` bị lỗi mạng, kiểm tra proxy/internet hoặc chạy trong Docker để dùng môi trường ổn định hơn.

## Ghi chú phát triển

- Frontend không gọi AI trực tiếp.
- Backend là nơi gọi Ollama trong `src/local-ai-client.ts`.
- Không hardcode key/model/URL trong source code.
- Không cho AI tạo test destructive, stress test, DDoS hoặc hành vi nguy hiểm.
- CSV là nguồn dữ liệu chính để tester review trước khi chạy automation.

