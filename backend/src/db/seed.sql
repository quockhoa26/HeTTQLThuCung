-- Seed Data for Pet Management System

-- 1. Insert Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'ADMIN', 'Quản trị viên hệ thống toàn quyền'),
(2, 'STAFF', 'Nhân viên lễ tân & chăm sóc thú cưng'),
(3, 'CUSTOMER', 'Khách hàng sử dụng dịch vụ')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for roles
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- 2. Insert Users
-- Default passwords:
-- admin: Admin@123
-- staff1: Staff@123
-- staff2: Staff@123
-- khachhang01: khoa12345
-- Generated with bcrypt (rounds: 10)
INSERT INTO users (id, username, password_hash, full_name, email, role_id, customer_id, is_active) VALUES
(1, 'admin', '$2b$10$iGg.z55uV3PqFfIqvfO4tOl9iF5m4Y9x3ElnqU8Pq57N10n7i0s1W', 'Nguyễn Quản Trị', 'admin@petcare.vn', 1, NULL, TRUE),
(2, 'staff1', '$2b$10$tZk527M3xG1uL0l7uN7Fhe5jWz6D1y1H2u2I3j4K5l6M7n8O9p0Qq', 'Lê Văn Bác Sĩ', 'staff1@petcare.vn', 2, NULL, TRUE),
(3, 'staff2', '$2b$10$tZk527M3xG1uL0l7uN7Fhe5jWz6D1y1H2u2I3j4K5l6M7n8O9p0Qq', 'Trần Thị Chăm Sóc', 'staff2@petcare.vn', 2, NULL, TRUE),
(6, 'khachhang01', '$2a$10$pzn1btSEWsVcR6R37rYNDe3LnDsYXv5ssth5QDnD6NpjnXbMFAljy', 'Khách Hàng Thử Nghiệm 01', 'khachhang01@gmail.com', 3, 6, TRUE)
ON CONFLICT (username) DO NOTHING;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 3. Insert Customers
INSERT INTO customers (id, full_name, phone, email, address, notes) VALUES
(1, 'Nguyễn Hoàng Nam', '0901234567', 'nam.nguyen@gmail.com', '123 Nguyễn Văn Cừ, Quận 5, TP.HCM', 'Khách hàng thân thiết, thường xuyên đưa cún đi spa'),
(2, 'Trần Thu Thảo', '0912345678', 'thao.tran@gmail.com', '456 Lê Duẩn, Quận 1, TP.HCM', 'Nuôi 2 bé mèo Anh lông ngắn, rất cẩn thận'),
(3, 'Phạm Minh Đức', '0987654321', 'duc.pham@hotmail.com', '789 Võ Thị Sáu, Quận 3, TP.HCM', 'Khách mới, bé cún hơi nhát người lạ'),
(4, 'Đỗ Mỹ Linh', '0933445566', 'linh.do@yahoo.com', '12 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM', 'Ưu tiên chăm sóc móng và tắm thảo dược'),
(5, 'Vũ Thành Long', '0977889900', 'long.vu@outlook.com', '88 Trường Chinh, Tân Bình, TP.HCM', 'Có hẹn định kỳ hàng tháng'),
(6, 'Khách Hàng Thử Nghiệm 01', '0988001122', 'khachhang01@gmail.com', '123 Nguyễn Thị Minh Khai, Quận 1, TP.HCM', 'Tài khoản khách hàng thử nghiệm hệ thống')
ON CONFLICT (id) DO NOTHING;

SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));

-- 4. Insert Services
INSERT INTO services (id, name, description, price, duration_minutes, is_active) VALUES
(1, 'Tắm spa & sấy tạo kiểu', 'Tắm sạch sâu khử mùi, massage thư giãn, sấy phồng và chải tơi lông chuyên nghiệp', 150000, 60, TRUE),
(2, 'Cắt tỉa lông nghệ thuật', 'Cắt tỉa lông theo yêu cầu, tạo dáng phong cách Hàn Quốc/Nhật Bản cho cún và mèo', 250000, 90, TRUE),
(3, 'Vệ sinh tai & nhổ lông tai', 'Vệ sinh sạch mảng bám tai, nhổ lông tai ngăn ngừa viêm tai giữa và ve rận tai', 50000, 30, TRUE),
(4, 'Cắt mài móng & cạo lông đệm chân', 'Cắt tỉa móng an toàn, mài mịn chống cào xước, cạo sạch lông đệm bàn chân', 60000, 30, TRUE),
(5, 'Khám sức khỏe tổng quát', 'Kiểm tra mắt, mũi, miệng, tim phổi, đo thân nhiệt và tư vấn dinh dưỡng thú y', 120000, 45, TRUE),
(6, 'Tiêm phòng vaccine phòng bệnh', 'Tiêm phòng vaccine đa bệnh nhập khẩu chính hãng (kèm sổ theo dõi)', 200000, 30, TRUE),
(7, 'Khách sạn thú cưng theo ngày', 'Dịch vụ lưu trú phòng máy lạnh, camera theo dõi 24/7 và 3 bữa ăn tiêu chuẩn', 180000, 1440, TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('services_id_seq', (SELECT MAX(id) FROM services));

-- 5. Insert Pets
INSERT INTO pets (id, pet_code, name, species, breed, gender, birth_date, weight, fur_color, health_status, notes, is_public, price, status, image_url, customer_id) VALUES
(1, 'PET001', 'LuLu', 'Chó', 'Poodle', 'Đực', '2022-05-10', 4.5, 'Nâu đỏ', 'Khỏe mạnh, năng động', 'Poodle thuần chủng thông minh, lông xoăn màu nâu đỏ, đã tiêm phòng 2 mũi', TRUE, 3500000, 'SAN_SANG', 'https://images.unsplash.com/photo-1516371535707-512a1e83bb9a?w=600&auto=format&fit=crop&q=80', 1),
(2, 'PET002', 'Miu Miu', 'Mèo', 'Anh lông ngắn', 'Cái', '2023-01-15', 3.8, 'Xám xanh', 'Đã tiêm phòng đủ', 'Mèo Anh lông ngắn xám xanh tròn trịa, mắt to tròn, rất ngoan và quấn chủ', TRUE, 5000000, 'SAN_SANG', 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600&auto=format&fit=crop&q=80', 2),
(3, 'PET003', 'Bông', 'Mèo', 'Ba Tư', 'Đực', '2021-11-20', 4.2, 'Trắng tuyết', 'Khỏe mạnh', 'Mèo Ba Tư lông trắng như tuyết, tính cách điềm tĩnh, quý phái', TRUE, 6500000, 'DA_DAT', 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600&auto=format&fit=crop&q=80', 2),
(4, 'PET004', 'Rocky', 'Chó', 'Golden Retriever', 'Đực', '2020-08-01', 28.5, 'Vàng kim', 'Tốt', 'Golden Retriever khỏe khoắn, yêu thích chạy nhảy và bơi lội, cực kỳ trung thành', TRUE, 8000000, 'SAN_SANG', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&auto=format&fit=crop&q=80', 3),
(5, 'PET005', 'Cacao', 'Chó', 'Phốc Sóc (Pomeranian)', 'Cái', '2023-03-25', 2.6, 'Vàng cam', 'Tốt', 'Bé Phốc Sóc Pomeranian mini màu vàng cam, nhanh nhẹn, thích vui đùa', TRUE, 4800000, 'SAN_SANG', 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&auto=format&fit=crop&q=80', 4),
(6, 'PET006', 'Simba', 'Mèo', 'Mèo ta', 'Đực', '2022-09-12', 4.0, 'Vàng mướp', 'Khỏe mạnh, nhanh nhẹn', 'Mèo mướp vàng ta mắt sáng, bắt chuột giỏi, háu ăn và dạn người', TRUE, 800000, 'SAN_SANG', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80', 5),
(7, 'PET007', 'Lucky', 'Chó', 'Corgi Welsh', 'Đực', '2023-06-10', 11.2, 'Vàng trắng', 'Khỏe mạnh, tiêm chủng đầy đủ', 'Bé Corgi chân ngắn đáng yêu của khách hàng 01', FALSE, 0, 'DA_CO_CHU', 'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=600&auto=format&fit=crop&q=80', 6),
(8, 'PET008', 'Kiki', 'Chim', 'Vẹt Macaw', 'Đực', '2023-04-12', 1.15, 'Xanh lam vàng đỏ', 'Khỏe mạnh, hoạt bát', 'Vẹt Macaw thông minh, thân thiện, đã được thuần dưỡng và huấn luyện đứng trên vai', TRUE, 12000000, 'SAN_SANG', 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600&auto=format&fit=crop&q=80', NULL),
(9, 'PET009', 'Rio', 'Chim', 'Yến Phụng (Budgerigar)', 'Cái', '2023-09-05', 0.05, 'Xanh ngọc pha vàng', 'Tốt, hót líu lo vui tai', 'Chim Yến Phụng non lanh lợi, ăn hạt kê, thích tương tác với con người, rất dễ nuôi', TRUE, 350000, 'SAN_SANG', 'https://images.unsplash.com/photo-1522858547137-f1dcec554f55?w=600&auto=format&fit=crop&q=80', NULL),
(10, 'PET010', 'Goldie', 'Cá', 'Cá Vàng Ranchu', 'Đực', '2023-10-01', 0.15, 'Đỏ cam ánh bạc', 'Khỏe mạnh, bơi lội linh hoạt', 'Cá vàng Ranchu nhập khẩu, dáng đầu lân tròn béo đáng yêu, thích hợp hồ kính trong nhà', TRUE, 450000, 'SAN_SANG', 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=600&auto=format&fit=crop&q=80', NULL),
(11, 'PET011', 'Neptune', 'Cá', 'Cá Betta Halfmoon', 'Đực', '2024-01-10', 0.04, 'Xanh dương Sapphire ánh kim', 'Sung mãn, vây đuôi hoàn hảo', 'Cá xiêm Betta đuôi xòe 180 độ màu xanh ánh kim tuyệt đẹp, thích hợp trang trí bàn làm việc', TRUE, 250000, 'SAN_SANG', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80', NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval('pets_id_seq', (SELECT MAX(id) FROM pets));

-- 6. Insert Appointments
INSERT INTO appointments (id, appointment_code, customer_id, pet_id, staff_id, appointment_date, end_time, status, notes) VALUES
(1, 'APT20261020-01', 1, 1, 2, '2026-10-21 09:00:00+07', '2026-10-21 10:30:00+07', 'DA_XAC_NHAN', 'Tắm và cắt tỉa lông cho bé LuLu'),
(2, 'APT20261020-02', 2, 2, 3, '2026-10-21 14:00:00+07', '2026-10-21 15:00:00+07', 'CHO_XAC_NHAN', 'Vệ sinh tai và cắt móng'),
(3, 'APT20261020-03', 3, 4, 2, '2026-10-20 08:30:00+07', '2026-10-20 10:00:00+07', 'HOAN_THANH', 'Tắm spa cho bé Rocky'),
(4, 'APT20261020-04', 4, 5, 3, '2026-10-22 10:00:00+07', '2026-10-22 11:30:00+07', 'CHO_XAC_NHAN', 'Cắt tỉa lông và cạo móng'),
(5, 'APT20261020-05', 5, 6, 2, '2026-10-19 15:00:00+07', '2026-10-19 16:00:00+07', 'HOAN_THANH', 'Khám sức khỏe tổng quát cho Simba'),
(6, 'APT20261022-KH01', 6, 7, 2, '2026-10-23 10:00:00+07', '2026-10-23 11:30:00+07', 'DA_XAC_NHAN', 'Tắm spa và cắt tỉa lông bé Lucky')
ON CONFLICT (id) DO NOTHING;

SELECT setval('appointments_id_seq', (SELECT MAX(id) FROM appointments));

-- 7. Insert Appointment Services
INSERT INTO appointment_services (appointment_id, service_id, price) VALUES
(1, 1, 150000),
(1, 2, 250000),
(2, 3, 50000),
(2, 4, 60000),
(3, 1, 150000),
(4, 2, 250000),
(4, 4, 60000),
(5, 5, 120000),
(6, 1, 150000),
(6, 2, 250000)
ON CONFLICT (appointment_id, service_id) DO NOTHING;

-- 8. Insert Invoices
INSERT INTO invoices (id, invoice_code, appointment_id, customer_id, pet_id, total_amount, status, payment_method, paid_at, notes) VALUES
(1, 'INV20261020-01', 3, 3, 4, 150000, 'DA_THANH_TOAN', 'TIEN_MAT', '2026-10-20 10:05:00+07', 'Thanh toán hoàn tất dịch vụ tắm spa'),
(2, 'INV20261019-01', 5, 5, 6, 120000, 'DA_THANH_TOAN', 'CHUYEN_KHOAN', '2026-10-19 16:05:00+07', 'Thanh toán chuyển khoản khám sức khỏe'),
(3, 'INV20261021-01', 1, 1, 1, 400000, 'CHUA_THANH_TOAN', 'TIEN_MAT', NULL, 'Hóa đơn tạm tính dịch vụ spa & cắt tỉa'),
(4, 'INV20261022-KH01', 6, 6, 7, 400000, 'CHUA_THANH_TOAN', 'CHUYEN_KHOAN', NULL, 'Hóa đơn tạm tính dịch vụ spa & cắt lông Lucky')
ON CONFLICT (id) DO NOTHING;

SELECT setval('invoices_id_seq', (SELECT MAX(id) FROM invoices));

-- 9. Insert Invoice Items
INSERT INTO invoice_items (invoice_id, service_id, service_name, quantity, unit_price, amount) VALUES
(1, 1, 'Tắm spa & sấy tạo kiểu', 1, 150000, 150000),
(2, 5, 'Khám sức khỏe tổng quát', 1, 120000, 120000),
(3, 1, 'Tắm spa & sấy tạo kiểu', 1, 150000, 150000),
(3, 2, 'Cắt tỉa lông nghệ thuật', 1, 250000, 250000),
(4, 1, 'Tắm spa & sấy tạo kiểu', 1, 150000, 150000),
(4, 2, 'Cắt tỉa lông nghệ thuật', 1, 250000, 250000);

-- 10. Insert Audit Logs
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES
(1, 'SYSTEM_INIT', 'SYSTEM', '0', '{"message": "Hệ thống Quản lý Thú cưng khởi tạo thành công"}'::jsonb),
(1, 'CREATE', 'CUSTOMER', '1', '{"full_name": "Nguyễn Hoàng Nam"}'::jsonb),
(1, 'CREATE', 'PET', '1', '{"name": "LuLu", "code": "PET001"}'::jsonb),
(2, 'COMPLETE', 'APPOINTMENT', '3', '{"code": "APT20261020-03", "status": "HOAN_THANH"}'::jsonb);
