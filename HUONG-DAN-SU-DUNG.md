# Hướng dẫn nhanh Passmark TestOps

## 1. Khởi động hệ thống

Yêu cầu: Docker Desktop đang chạy.

```powershell
docker compose up --build
```

Sau khi các dịch vụ khởi động xong, mở:

```text
http://localhost:5000
```

## 2. Cách sử dụng

### Dành cho Dev

1. Chọn **Dev View**.
2. Chọn Project, Environment và Target.
3. Bấm **Run Smoke** để kiểm tra nhanh.
4. Mở **Runs** để xem lỗi, evidence và chạy lại test thất bại.

Nếu test ứng dụng đang chạy trên máy cá nhân, chọn **Local**, nhập URL như `http://localhost:3000` trong Quick Run rồi chọn Smoke pack. Khi Passmark chạy bằng Docker, hệ thống tự kết nối qua `host.docker.internal`; bạn không cần đổi URL bằng tay.

### Dành cho Tester

1. Chọn **QA View**.
2. Vào **Test Workspace**.
3. Tạo hoặc import Test Case; sắp xếp vào Smoke/Regression Pack.
4. Dùng **Test Cycles** để chạy manual test.
5. Dùng **Generate** để AI local đề xuất test case.
6. Vào **Reports** để xem chất lượng và xuất CSV.

## 3. AI local

Bấm nút AI trên thanh trên cùng:

- **Check:** kiểm tra kết nối AI.
- **Test:** thử phản hồi của model.
- **Unload:** giải phóng model khỏi bộ nhớ.

Model và địa chỉ AI được cấu hình trong file `.env`.

Cấu hình hiện tại dùng `qwen2.5-coder:3b`, phù hợp máy 16 GB RAM. Bình thường bạn không cần chạy lệnh tải model lại.

Nếu máy đang cần RAM cho công việc khác, bấm **Unload** trong bảng AI. Khi cần Generate lần sau, hệ thống sẽ tự nạp lại model.

Kiểm tra nhanh các dịch vụ:

```powershell
docker compose ps
```

Nếu vừa mở máy hoặc Docker Desktop mới khởi động:

```powershell
docker compose up -d
```

## 4. Dừng hệ thống

```powershell
docker compose down
```

> Nếu giao diện báo **Backend unavailable**, hãy kiểm tra Docker Desktop và PostgreSQL đã chạy chưa.
