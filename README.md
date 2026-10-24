# HỆ THỐNG QUẢN LÝ THÚ CƯNG (PETCARE MANAGEMENT SYSTEM)

Đề tài thực hành môn học: **Triển khai và Quản trị Hệ thống Phần mềm**  
Mã đề tài: **Đề 28 - Hệ thống Quản lý Cửa hàng Thú cưng**  
Thư mục dự án: `C:\Users\admin\Downloads\HeThongQuanLyThuCung`

---

## 1. Giới Thiệu & Kiến Trúc Tổng Thể

Hệ thống quản lý thú cưng là giải pháp web ứng dụng toàn diện dành cho các chuỗi phòng khám, spa và khách sạn thú cưng. Hệ thống được đóng gói hoàn toàn trong môi trường Docker Compose gồm 11 dịch vụ, đáp ứng đầy đủ tiêu chí triển khai, phân quyền bảo mật, thu thập số liệu giám sát (Metrics) và log tập trung (Logging).

### Công nghệ sử dụng:
- **Frontend**: React 18, Vite, TypeScript, Vanilla CSS Design System, Lucide React icons.
- **Backend**: Node.js 20, Express, TypeScript, PostgreSQL Client (`pg`), JWT, Bcrypt, Zod Validation, Winston Logger, Prom-client.
- **Cơ sở dữ liệu**: PostgreSQL 16 (chạy container với volume bền vững `pgdata`, bảo vệ mạng nội bộ không mở port trực tiếp ra ngoài).
- **Quản trị CSDL**: pgAdmin 4 Web UI.
- **Reverse Proxy**: Nginx Alpine (Reverse Proxy cho Frontend & API Backend, bảo mật HTTP headers, gộp log JSON, cấp phát cổng `8080` tránh xung đột cổng 80 của Windows).
- **Giám sát số liệu (Metrics)**:
  - **Prometheus**: Thu thập số liệu chu kỳ 5s từ Backend, PostgreSQL Exporter và Nginx Exporter.
  - **Grafana**: Hiển thị bảng điều khiển trực quan thời gian thực (Dashboard Nghiệp vụ, Hạ tầng & Logs).
  - **PostgreSQL Exporter**: Giám sát kết nối, dung lượng và truy vấn DB.
  - **Nginx Prometheus Exporter**: Giám sát lưu lượng kết nối Nginx qua `stub_status`.
- **Hệ thống log tập trung (Logging)**:
  - **Loki**: Lưu trữ và đánh chỉ mục log phi cấu trúc / JSON.
  - **Promtail**: Thu thập log thời gian thực từ container backend và nginx đẩy về Loki.
  - **LogQL**: Truy vấn log trực tiếp trên Grafana Explore.

---

## 2. Cấu Trúc Thư Mục Dự Án

```
HeThongQuanLyThuCung/
├── backend/
│   ├── src/
│   │   ├── config/          # Cấu hình biến môi trường & PostgreSQL Connection Pool
│   │   ├── controllers/     # Controller: Auth, Pets, Customers, Services, Appointments, Invoices, Dashboard, Audit
│   │   ├── db/              # Schema DDL (schema.sql), Dữ liệu mẫu (seed.sql), Runner (migrate.ts, seed.ts)
│   │   ├── middlewares/     # JWT Auth, Phân quyền Role, Xử lý lỗi, Prometheus Metrics Tracker
│   │   ├── routes/          # API Routers
│   │   ├── services/        # Nghiệp vụ tính tiền, kiểm tra trùng lịch nhân viên
│   │   ├── tests/           # Kiểm thử tự động Vitest (Bcrypt, JWT, Trùng lịch, Tính hóa đơn)
│   │   ├── utils/           # Winston Logger, Prometheus Registry, Audit Helper
│   │   └── index.ts         # Server Entry Point & Khởi động an toàn
│   ├── Dockerfile           # Multi-stage Dockerfile chạy quyền non-root (node)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, Sidebar, Modal, StatCard, Toast Notification
│   │   ├── context/         # AuthContext quản lý phiên đăng nhập & Role
│   │   ├── pages/           # Dashboard, Pets, Customers, Services, Appointments, Invoices, AuditLogs, Login
│   │   ├── services/        # API Client giao tiếp backend qua Nginx proxy
│   │   ├── types/           # Định nghĩa kiểu dữ liệu TypeScript
│   │   ├── App.tsx          # Điều phối giao diện chính & Routing
│   │   ├── index.css        # Vanilla CSS Design System chuẩn hiện đại
│   │   └── main.tsx
│   ├── Dockerfile           # Multi-stage Dockerfile (Vite Build + Nginx Alpine)
│   ├── nginx.conf           # Cấu hình phục vụ file tĩnh và SPA routing
│   ├── package.json
│   └── vite.config.ts
├── nginx/
│   ├── nginx.conf           # Nginx Reverse Proxy, Security Headers, JSON log, Proxy Upstreams
│   └── custom_50x.html      # Trang thông báo lỗi 50x thân thiện bằng tiếng Việt
├── prometheus/
│   └── prometheus.yml       # Cấu hình Scrape Jobs (Prometheus, Backend, Nginx, Postgres)
├── grafana/
│   └── provisioning/
│       ├── datasources/     # Tự động nạp Prometheus & Loki Datasource
│       └── dashboards/      # Tự động nạp PetCare System Dashboard (JSON)
├── loki/
│   └── loki-config.yml      # Cấu hình lưu trữ và schema Loki TSDB
├── promtail/
│   └── promtail-config.yml  # Thu thập log Backend & Nginx chuyển đến Loki
├── docker-compose.yml       # Định nghĩa 11 dịch vụ, 3 mạng riêng biệt và 6 volume
├── .env.example             # File mẫu biến môi trường
├── .env                     # File cấu hình môi trường thực thi
├── .gitignore
└── README.md                # Tài liệu hướng dẫn chi tiết
```

---

## 3. Danh Sách Dịch Vụ & Địa Chỉ Truy Cập

| STT | Dịch Vụ | Container Name | Cổng Host | Địa chỉ truy cập / Chức năng |
|---|---|---|---|---|
| 1 | **Cổng ứng dụng chính (Nginx)** | `pet-nginx` | **8080** / **8443** | **http://localhost:8080** hoặc **https://localhost:8443** (Reverse Proxy, SSL tự ký, Security Headers) |
| 2 | **API Backend (Health Check)** | `pet-backend` | Nội bộ (5000) | **http://localhost:8080/api/health** |
| 3 | **Prometheus Metrics Endpoint** | `pet-backend` | Nội bộ (5000) | **http://localhost:8080/metrics** |
| 4 | **Bảng điều khiển Grafana** | `pet-grafana` | **3001** | **http://localhost:3001** (Dashboard giám sát & LogQL) |
| 5 | **Prometheus Server** | `pet-prometheus` | **9090** | **http://localhost:9090** (Targets & PromQL Query) |
| 6 | **Công cụ quản trị pgAdmin 4** | `pet-pgadmin` | **5050** | **http://localhost:5050** (Quản lý Database PostgreSQL) |
| 7 | **Hệ thống Log Loki** | `pet-loki` | **3100** | **http://localhost:3100/ready** (Loki Status) |
| 8 | **PostgreSQL Database** | `pet-postgres` | Nội bộ (5432) | Cách ly trong mạng `backend-net`, không mở port ngoài |
| 9 | **PostgreSQL Exporter** | `pet-postgres-exporter`| Nội bộ (9187) | Cung cấp metrics Database cho Prometheus |
| 10 | **Nginx Exporter** | `pet-nginx-exporter` | Nội bộ (9113) | Cung cấp metrics Nginx connection cho Prometheus |
| 11 | **Promtail Log Shipper** | `pet-promtail` | Nội bộ (9080) | Thu thập log container và đẩy về Loki |
| 12 | **cAdvisor Container Metrics** | `pet-cadvisor` | Nội bộ (8080) | Thu thập CPU, Memory, Network của các container cho Prometheus |

---

## 4. Danh Sách Tài Khoản Thử Nghiệm (Demo Accounts)

### 4.1. Ứng dụng Web Quản Lý Thú Cưng (`http://localhost:8080`)
Hệ thống tích hợp sẵn nút bấm **Đăng nhập 1-chạm** trên giao diện:
- **Tài khoản Quản trị viên (ADMIN)**:
  - Tên đăng nhập: `admin`
  - Mật khẩu: `Admin@123`
  - Quyền hạn: Toàn quyền quản lý thú cưng, khách hàng, tạo/sửa bảng giá dịch vụ, đặt lịch hẹn, thu tiền hóa đơn và xem toàn bộ nhật ký hệ thống (Audit Logs).
- **Tài khoản Nhân viên chăm sóc (STAFF)**:
  - Tên đăng nhập: `staff1` (Lê Văn Bác Sĩ) hoặc `staff2` (Trần Thị Chăm Sóc)
  - Mật khẩu: `Staff@123`
  - Quyền hạn: Tiếp nhận thú cưng, xem danh sách, cập nhật tiến độ lịch hẹn, lập hóa đơn thanh toán.

### 4.2. Bảng điều khiển Grafana (`http://localhost:3001`)
- Tên đăng nhập: `admin` (hoặc giá trị biến `GF_SECURITY_ADMIN_USER` trong file `.env`)
- Mật khẩu: Được cấu hình qua biến `GF_SECURITY_ADMIN_PASSWORD` trong file `.env` (tham khảo mẫu tại `.env.example`)
- Bảng điều khiển đã nạp sẵn: **PetCare Management - Giám Sát Hệ Thống & Logs**

### 4.3. Quản trị Cơ sở dữ liệu pgAdmin 4 (`http://localhost:5050`)
- Email: `admin@petcare.vn`
- Mật khẩu: `PgAdmin2026!`
- Thông số kết nối Server vào PostgreSQL:
  - Host name / address: `postgres` (Tên container trong Docker)
  - Port: `5432`
  - Maintenance database: `petmanagement`
  - Username: `petadmin`
  - Password: `PetAdminStrong2026!Secured`

---

## 5. Các Biện Pháp Hardening & Bảo Mật Đã Áp Dụng

1. **Non-Root Container**:
   - Backend chạy dưới quyền user không đặc quyền `node` (UID/GID 1000) thông qua Dockerfile multi-stage.
2. **Network Isolation (Phân tách mạng nội bộ)**:
   - Hệ thống chia thành 3 mạng bridge độc lập:
     - `frontend-net`: Chỉ gồm Nginx, Frontend và Backend.
     - `backend-net`: Chỉ gồm Backend, PostgreSQL, pgAdmin và PostgreSQL Exporter.
     - `monitor-net`: Prometheus, Grafana, Loki, Promtail và các Exporters.
   - Database PostgreSQL **hoàn toàn không mở cổng ra Host**, ngăn chặn truy cập trái phép từ bên ngoài máy chủ.
3. **Mật khẩu mạnh & Băm mật khẩu một chiều**:
   - Mật khẩu người dùng được băm bằng thuật toán `bcrypt` với 10 vòng sinh muối (salt rounds). Không bao giờ lưu mật khẩu dạng văn bản thô.
4. **Nginx Reverse Proxy, Security Headers & HTTPS Tự Ký**:
   - `X-Frame-Options: SAMEORIGIN` (Chống Clickjacking)
   - `X-Content-Type-Options: nosniff` (Chống MIME-type sniffing)
   - `X-XSS-Protection: 1; mode=block` (Chống phản xạ XSS)
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Content-Security-Policy`: Kiểm soát nguồn tài nguyên hợp lệ
   - `Strict-Transport-Security (HSTS)`: Bắt buộc HTTPS khi truy cập cổng SSL (443/8443)
   - `server_tokens off;` (Ẩn hoàn toàn phiên bản Nginx)
   - **Rate Limiting**: Giới hạn tần suất 30 req/s cho `/api/` để chống tấn công DoS/Brute-force
   - **Bảo vệ endpoint nội bộ**: Khóa endpoint `/stub_status` và `/metrics` chỉ cho phép mạng Docker nội bộ (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), từ chối toàn bộ IP bên ngoài (`deny all;`)
   - **Trang lỗi 50x tùy biến**: Hiển thị giao diện thông báo bằng tiếng Việt chuyên nghiệp khi backend đang khởi động
5. **Masking dữ liệu nhạy cảm trong Log**:
   - Module Winston Logger tự động lọc và thay thế chuỗi chứa `password`, `token`, `secret`, `authorization` bằng `***REDACTED***` trước khi xuất ra log.
6. **Bảo toàn toàn vẹn dữ liệu (Transactions & Validation)**:
   - Đặt lịch hẹn, lập hóa đơn, thanh toán đều được thực hiện trong **PostgreSQL Transactions** (`BEGIN ... COMMIT / ROLLBACK`).
   - Tổng tiền hóa đơn được tính toán an toàn phía Backend theo đơn giá dịch vụ thực tế, loại trừ rủi ro sửa giá từ Frontend.
   - Quy tắc chống trùng lịch nhân viên (`checkStaffConflict`) tự động phát hiện và chặn các lịch hẹn giao thoa khung giờ của cùng một nhân viên.

---

## 6. Hướng Dẫn Vận Hành & Khởi Động Bằng Docker Compose

### 6.1. Khởi động toàn bộ hệ thống
Mở PowerShell tại thư mục dự án:
```powershell
docker compose up -d --build
```
> **Lưu ý**: Lần đầu chạy, Docker Compose sẽ tự động tải các base images chính hãng, biên dịch Frontend, biên dịch Backend và tạo các volume bền vững.

### 6.2. Kiểm tra trạng thái các container
```powershell
docker compose ps
```
Tất cả các dịch vụ sẽ hiển thị trạng thái `Up` (hoặc `healthy`).

### 6.3. Khởi tạo Cơ sở dữ liệu và Dữ liệu mẫu (Seed Data)
Backend đã được tích hợp cơ chế **tự động kiểm tra schema** khi khởi động. Nếu bảng `users` chưa có trong database, backend sẽ tự động chạy toàn bộ file `schema.sql` và nạp dữ liệu mẫu từ `seed.sql`.

Nếu bạn muốn chạy lại migration hoặc seed thủ công:
```powershell
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed
```

### 6.4. Dừng và khởi động lại hệ thống
- **Tạm dừng các dịch vụ**:
  ```powershell
  docker compose stop
  ```
- **Bật lại các dịch vụ**:
  ```powershell
  docker compose start
  ```
- **Tắt và dọn container (bảo tồn dữ liệu trong volume)**:
  ```powershell
  docker compose down
  ```

---

## 7. Kiểm Thử Hệ Thống (Testing Suite)

### 7.1. Chạy bài kiểm thử tự động Backend (Vitest)
Các bài kiểm thử bao gồm: băm mật khẩu bcrypt, tạo và xác minh JWT Token, ngăn chặn token giả mạo, tự động tính tổng tiền hóa đơn an toàn, và thuật toán phát hiện trùng lịch hẹn:
```powershell
cd backend
npm test
```
*Kết quả xác minh: 5/5 bài kiểm thử PASS 100%.*

### 7.2. Kiểm tra biên dịch mã nguồn Frontend & Backend
- Backend TypeScript compilation:
  ```powershell
  cd backend; npm run build
  ```
- Frontend React & TypeScript bundling:
  ```powershell
  cd frontend; npm run build
  ```

### 7.3. Kiểm tra Giám Sát Prometheus & Grafana Dashboard
1. **Kiểm tra trạng thái Prometheus Targets**:
   - Truy cập: `http://localhost:9090/targets`
   - Đảm bảo tất cả 5 targets đều hiển thị `State: UP`:
     - `prometheus`: `localhost:9090` (Prometheus server)
     - `backend`: `backend:5000/metrics` (Node.js & Business Metrics)
     - `nginx`: `nginx_exporter:9113` (Web server connections)
     - `postgres`: `postgres_exporter:9187` (PostgreSQL Database metrics)
     - `cadvisor`: `cadvisor:8080` (Container CPU/RAM/Disk metrics)
2. **Kiểm tra truy vấn PromQL mẫu trên Prometheus**:
   - `sum(rate(pet_http_requests_total[1m])) by (status_code)`: Tần suất request HTTP
   - `histogram_quantile(0.95, sum(rate(pet_http_request_duration_seconds_bucket[1m])) by (le))`: Độ trễ P95
   - `pet_total_pets`: Số lượng thú cưng (dữ liệu thật từ database qua gauge refresh)
   - `pet_total_revenue_vnd`: Tổng doanh thu đã thanh toán
   - `sum(rate(container_cpu_usage_seconds_total{name=~"pet-.*"}[1m])) by (name) * 100`: % CPU Container
3. **Kiểm tra Dashboard Grafana**:
   - Truy cập: `http://localhost:3001`
   - Đăng nhập: Tài khoản admin với mật khẩu `GF_SECURITY_ADMIN_PASSWORD` từ file `.env`
   - Mở Dashboard: **PetCare Management - Giám Sát Hệ Thống & Logs**
   - Xác nhận các panels: Business Metrics, Web & Infrastructure Metrics, cAdvisor Container Resources hiển thị biểu đồ trực quan thời gian thực.


---

## 8. Hướng Dẫn Thu Thập & Truy Vấn Log Bằng LogQL (Loki + Promtail)

### 8.1. Quy trình Thu thập và Luân chuyển Log
- **Backend Application Logs**: Thư viện Winston ghi log định dạng JSON đa cấp độ (`info`, `warn`, `error`) vào volume `app_logs` (`/app/logs/backend.log` và `/app/logs/error.log`). Promtail tự động đọc tệp, phân tích JSON và gắn nhãn nhãn (`service="backend"`, `level`, `statusCode`).
- **Nginx Access & Error Logs**: Nginx xuất log truy cập định dạng JSON cấu trúc cao vào volume `nginx_logs` (`/var/log/nginx/app_access.log`). Promtail đọc và gắn nhãn (`service="nginx"`, `status`, `request_method`).
- **Loki Ingestion**: Promtail chuyển log qua giao thức HTTP push endpoint `http://loki:3100/loki/api/v1/push`.
- **Grafana Visualization**: Người quản trị truy vấn trực quan thời gian thực trên Grafana qua nguồn dữ liệu `Loki`.

### 8.2. Các Bước Tạo Hoạt Động Để Sinh Log (Traffic Generation)
Trước khi truy vấn trên Grafana, tạo các hoạt động thực tế để hệ thống ghi log:
1. **Tạo log truy cập và nghiệp vụ thông thường (HTTP 200)**:
   ```powershell
   curl http://localhost:8080/api/health
   curl http://localhost:8080/api/services
   curl http://localhost:8080/api/pets
   ```
2. **Tạo log cảnh báo/lỗi (HTTP 401, 404 để kiểm thử bộ lọc lỗi)**:
   ```powershell
   # Gọi API quản trị không kèm Token (HTTP 401 Unauthorized)
   curl -i http://localhost:8080/api/users
   # Gọi đường dẫn không tồn tại (HTTP 404 Not Found)
   curl -i http://localhost:8080/api/non-existing-endpoint
   ```

### 8.3. Danh Sách 5 Truy Vấn LogQL Tiêu Chuẩn Cho Đề Thi
Mở Grafana tại `http://localhost:3001` -> Vào mục **Explore** (biểu tượng La bàn) -> Chọn Datasource **Loki**:

1. **Truy vấn 1: Giám sát toàn bộ log hệ thống Backend**:
   ```logql
   {service="backend"}
   ```
   - *Mục đích*: Xem toàn bộ luồng log ứng dụng Backend theo thời gian thực (Request duration, database status, transaction).

2. **Truy vấn 2: Lọc log lỗi và cảnh báo nghiêm trọng phía Backend**:
   ```logql
   {service="backend"} | json | level =~ "error|warn"
   ```
   - *Mục đích*: Tự động trích xuất cấu trúc JSON từ Winston log, lọc riêng các bản ghi có mức độ `error` hoặc `warn` để điều tra ngoại lệ hoặc sự cố kết nối.

3. **Truy vấn 3: Phân tích Nginx Access Logs phát hiện lỗi HTTP 4xx và 5xx**:
   ```logql
   {service="nginx"} | json | status >= 400
   ```
   - *Mục đích*: Lọc tất cả các request thất bại từ reverse proxy (Client Error 4xx như 401, 403, 404 hoặc Gateway Error 5xx như 502, 504).

4. **Truy vấn 4: Thống kê tần suất HTTP request theo phương thức (Metric Query)**:
   ```logql
   sum by (request_method) (rate({service="nginx"} | json [1m]))
   ```
   - *Mục đích*: Chuyển đổi dữ liệu log thành đồ thị lưu lượng (Log-to-Metric), hiển thị số lượng request mỗi giây phân loại theo `GET`, `POST`, `PUT`, `DELETE`.

5. **Truy vấn 5: Điều tra các hoạt động bảo mật, thanh toán hoặc đặt lịch**:
   ```logql
   {service="backend"} |= "HTTP Request" | json | path =~ "/api/auth/.*|/api/invoices/.*|/api/appointments/.*"
   ```
   - *Mục đích*: Truy vết hành vi người dùng đối với các endpoint trọng yếu (Đăng nhập, Quản lý hóa đơn, Lập lịch khám).


---

## 9. Các Lỗi Thường Gặp & Cách Khắc Phục

1. **Lỗi "bind: address already in use" với cổng 80 trên Windows**:
   - *Nguyên nhân*: Windows thường có tiến trình PID 4 (System - HTTP.sys, IIS hoặc Web Deployment Service) chiếm giữ cổng 80.
   - *Giải pháp*: Cổng Nginx của hệ thống được cấu hình sẵn là `8080` trong `.env` (`NGINX_PORT=8080`). Truy cập qua `http://localhost:8080`.
2. **Backend báo lỗi "Cannot reach database" khi khởi động lần đầu**:
   - *Nguyên nhân*: PostgreSQL container mất khoảng 5-10 giây để khởi tạo cụm dữ liệu ban đầu.
   - *Giải pháp*: Backend đã có cơ chế tự động thử lại kết nối 10 lần liên tục (mỗi lần cách nhau 2 giây) kèm theo Docker `healthcheck` điều kiện `service_healthy`.
3. **Cần xóa toàn bộ dữ liệu để làm lại từ đầu (Reset)**:
   - Chạy lệnh: `docker compose down -v` rồi khởi động lại `docker compose up -d --build`.
