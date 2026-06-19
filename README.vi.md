# Passmark TestOps

<p>
  <img alt="Local AI" src="https://img.shields.io/badge/AI-Ollama%20local-111827?style=for-the-badge">
  <img alt="Automation" src="https://img.shields.io/badge/Automation-Playwright-2563eb?style=for-the-badge">
  <img alt="Database" src="https://img.shields.io/badge/Database-PostgreSQL-334155?style=for-the-badge">
  <img alt="QC Files" src="https://img.shields.io/badge/Export-CSV%20%7C%20Excel%20%7C%20Word-16a34a?style=for-the-badge">
</p>

**Passmark TestOps biến URL và mô tả nghiệp vụ thành file testcase chuẩn QC trong vài phút, chạy local mặc định.**

Sản phẩm dành cho QC/Tester vẫn cần artifact có thể review trước khi automation: sinh CSV/Excel/Word, tải về chỉnh sửa, import CSV lại hệ thống, chạy Playwright an toàn, lưu screenshot và xuất file kết quả cuối cùng.

<p>
  <a href="./README.md"><strong>Trang chọn ngôn ngữ</strong></a>
  &nbsp;|&nbsp;
  <a href="./README.en.md"><strong>English</strong></a>
</p>

## Vì Sao Nên Thử

Viết testcase cho login, register, checkout, SEO hoặc UI regression thường mất 1-2 giờ trước khi tester bắt đầu chạy. Passmark TestOps rút ngắn bước soạn bản nháp:

```text
URL + bối cảnh nghiệp vụ
-> 40+ dòng testcase có cấu trúc
-> CSV / Excel / Word để QC review
-> tùy chọn chạy Playwright
-> file kết quả có Actual Result, Pass/Fail và screenshot
```

Runtime mặc định chạy local: Docker Compose bật PostgreSQL, Ollama và web app. Model mặc định là `qwen2.5-coder:0.5b`, nên không cần API AI trả phí trong flow mặc định.

## Chạy Nhanh Bằng Docker

Yêu cầu:

- Docker Desktop đang chạy.
- Máy còn khoảng 4 GB RAM trống cho service Ollama.

Chạy toàn bộ hệ thống:

```powershell
git clone https://github.com/Mavis-TETRA/passmark-testops.git
cd passmark-testops
copy .env.example .env
docker compose up --build
```

Mở app:

```text
http://localhost:5000
```

Lần đầu có thể lâu hơn vì Docker cần pull image và Ollama cần tải model.

## Prompt Nên Thử Đầu Tiên

1. Mở `http://localhost:5000`.
2. Giữ mode **Create testcase file**.
3. Nhập URL public/staging mà bạn được phép test.
4. Dán request này:

```text
Create QC testcases for a login form, including valid login, invalid password,
empty required fields, locked account, session timeout, accessibility labels,
and screenshot evidence for failures.
```

Kết quả mong đợi: app sinh bộ file testcase. Tải Excel hoặc Word để review thủ công, dùng CSV khi muốn import file đã chỉnh sửa lại app để chạy automation.

## Demo Và File Mẫu

- CSV mẫu đúng format import của app: [docs/samples/login-form-testcases.csv](./docs/samples/login-form-testcases.csv)
- Format app xuất ra: CSV, Excel-compatible `.xls`, Word-compatible `.doc`
- Asset nên bổ sung tiếp: GIF 30-60 giây cho flow nhập URL -> sinh file -> tải file -> import chạy lại.

## Flow Sản Phẩm

```mermaid
flowchart LR
  A["Nhập URL + yêu cầu test"] --> B["AI local sinh file testcase"]
  B --> C["Xuất CSV / Excel / Word"]
  C --> D["Tester review và chỉnh sửa"]
  D --> E["Import CSV lại app"]
  E --> F["Chạy Playwright an toàn"]
  F --> G["Ghi Actual Result + screenshot"]
  G --> H["Xuất bộ file kết quả"]
```

## Giá Trị Chính

| Nỗi đau của QC | Passmark TestOps xử lý |
| --- | --- |
| Viết testcase mất nhiều thời gian | AI tạo dòng testcase có objective, steps, expected result, priority, severity và gợi ý automation |
| Tester cần review trước automation | CSV/Excel/Word là artifact chính, không phải phần phụ |
| Không phải testcase nào cũng nên auto-run | CSV import được map sang nhóm automation an toàn; case manual vẫn giữ manual |
| Không muốn phụ thuộc API AI ngoài | Mặc định dùng Ollama local |
| Khi fail cần evidence | Playwright có thể chụp screenshot và ghi actual result vào file cuối |

## 3 Use Case Dễ Demo

| Use case | Gợi ý prompt |
| --- | --- |
| Login form | Đăng nhập đúng, sai mật khẩu, bỏ trống field, tài khoản khóa, timeout session, accessibility |
| API endpoint | Auth, required fields, invalid payload, status code, response shape, error state |
| UI regression | Nội dung hiển thị, navigation, responsive layout, form, hình ảnh, trạng thái lỗi, screenshot evidence |

## Kiến Trúc

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

## Tech Stack

| Layer | Công nghệ |
| --- | --- |
| Frontend | Static HTML/CSS/JS trong `public/` |
| Backend | Node.js + TypeScript, native HTTP server |
| Database | PostgreSQL + Prisma |
| Local AI | Ollama native `/api/chat` |
| Automation | Playwright Chromium |
| Export | CSV, HTML Office-compatible Excel/Word |
| Runtime | Docker Compose |

## Chạy App Ngoài Docker

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

## Cấu Hình Môi Trường

Tạo `.env` từ `.env.example`.

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

Docker Compose đã cấu hình sẵn giá trị này cho service `app`.

## Docker Services

| Service | Vai trò |
| --- | --- |
| `postgres` | Database chính |
| `ollama` | Local AI server |
| `ollama-model` | Job pull model `qwen2.5-coder:0.5b`, chạy xong tự dừng |
| `app` | Passmark TestOps web app |

`ollama-model` dừng sau khi pull model là bình thường. Container cần chạy liên tục là `postgres`, `ollama` và `app`.

## Lệnh Thường Dùng

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

Nếu `npm run web` báo không kết nối được `localhost:5432`, bật database:

```powershell
docker compose up -d postgres
```

### `ollama-model` không chạy liên tục

Đây là bình thường. Nó là job pull model một lần, không phải service nền.

### AI trả JSON lỗi hoặc thiếu case

App có fallback để không làm hỏng flow. Với model nhỏ như `qwen2.5-coder:0.5b`, chất lượng có thể không bằng model lớn. Có thể đổi model sau, nhưng nên cân nhắc RAM/GPU.

## Metadata Nên Cập Nhật Trên GitHub

Các mục này chỉnh trực tiếp trên GitHub, không nằm trong file repo:

- Description: `Local AI QC testcase generator: URL + testing request -> CSV/Excel/Word testcases + Playwright result evidence`
- Topics: `ai-testing`, `qc`, `testcase-generator`, `playwright`, `ollama`, `test-automation`, `local-ai`, `postgresql`
- Website: thêm link demo video, screenshot hoặc docs public khi có.

## Nguyên Tắc Phát Triển

- Frontend không gọi AI trực tiếp.
- Backend gọi Ollama qua `src/local-ai-client.ts`.
- Không hardcode AI URL, model hoặc key trong source.
- Không cho AI tạo destructive test, stress test, DDoS hoặc hành vi nguy hiểm.
- File testcase QC là artifact chính để tester review; CSV là định dạng máy đọc để import trước khi chạy automation.
