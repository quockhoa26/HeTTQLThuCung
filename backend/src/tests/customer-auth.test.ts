import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken, UserPayload } from '../utils/jwt.js';

const API_BASE = process.env.TEST_API_URL || 'http://localhost:8080/api';

describe('PHẦN 6: KIỂM THỬ PHÂN QUYỀN VÀ BẢO MẬT (CUSTOMER, STAFF, ADMIN)', () => {
  let customerToken: string = '';
  let staffToken: string = '';
  let adminToken: string = '';
  let customerId: number | null = null;
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testNewUser = `testkh_${uniqueSuffix}`;
  const testNewEmail = `testkh_${uniqueSuffix}@example.com`;
  const testNewPhone = `0911${uniqueSuffix.padStart(6, '0')}`;

  // Helper fetch function
  async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    const res = await fetch(url, { ...options, headers });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, ok: res.ok, data };
  }

  // --- UNIT TESTS CHO BẢO MẬT VÀ PHÂN QUYỀN DỮ LIỆU ---
  describe('Unit Tests: Token, Bcrypt & Role Logic', () => {
    it('1. Token generation & verification hỗ trợ role CUSTOMER và customerId', () => {
      const payload: UserPayload = {
        id: 999,
        username: 'test_customer',
        role: 'CUSTOMER',
        fullName: 'Khách Hàng Test',
        customerId: 123,
      };

      const token = generateToken(payload);
      expect(token).toBeTruthy();

      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.role).toBe('CUSTOMER');
      expect(decoded?.customerId).toBe(123);
      expect(decoded?.username).toBe('test_customer');
    });

    it('2. Bcrypt hash an toàn cho mật khẩu khách hàng và không lưu plain text', async () => {
      const rawPassword = 'khoa12345';
      const hash = await bcrypt.hash(rawPassword, 10);

      expect(hash).not.toBe(rawPassword);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

      const isValid = await bcrypt.compare(rawPassword, hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('wrongpass', hash);
      expect(isInvalid).toBe(false);
    });
  });

  // --- NHÓM A: KHÁCH CHƯA ĐĂNG NHẬP ---
  describe('Nhóm A. Khách chưa đăng nhập (Unauthenticated Guest)', () => {
    it('A1. Gọi API danh sách thú cưng công khai: thành công (HTTP 200, dữ liệu đã lọc thông tin nhạy cảm)', async () => {
      const res = await apiRequest('/pets/public');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);

      if (res.data.data.length > 0) {
        const pet = res.data.data[0];
        expect(pet).toHaveProperty('id');
        expect(pet).toHaveProperty('name');
        expect(pet).toHaveProperty('species');
        expect(pet).toHaveProperty('price');
        expect(pet).toHaveProperty('status');
        // Không chứa thông tin định danh nhạy cảm của khách hàng hay audit
        expect(pet.customer_id).toBeUndefined();
        expect(pet.created_by).toBeUndefined();
      }
    });

    it('A2. Đăng ký CUSTOMER hợp lệ: thành công (HTTP 201)', async () => {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Nguyễn Văn Test',
          phone: testNewPhone,
          email: testNewEmail,
          username: testNewUser,
          password: 'Password123!',
          address: '123 Đường Test, TP.HCM',
        }),
      });

      expect([200, 201]).toContain(res.status);
      expect(res.data.success).toBe(true);
      expect(res.data.data.user.role).toBe('CUSTOMER');
      // Không bao giờ trả về password hash
      expect(res.data.data.user.password).toBeUndefined();
    });

    it('A3. Đăng ký với role ADMIN: Backend từ chối nâng quyền (HTTP 400)', async () => {
      const privilegeUser = `hacker_${uniqueSuffix}`;
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Hacker Wannabe',
          phone: `0999${uniqueSuffix.padStart(6, '0')}`,
          email: `hacker_${uniqueSuffix}@hack.com`,
          username: privilegeUser,
          password: 'Password123!',
          role: 'ADMIN', // Cố tình gửi role ADMIN để leo thang đặc quyền
        }),
      });

      // Backend từ chối nâng quyền với HTTP 400
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
      expect(res.data.message).toContain('không được phép tự gán quyền');
    });

    it('A4. Đăng ký trùng username hoặc phone đã tồn tại: bị từ chối đúng cách (HTTP 409 hoặc 400)', async () => {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Người Trùng Tên',
          phone: testNewPhone, // Trùng số điện thoại
          email: `different_${uniqueSuffix}@example.com`,
          username: testNewUser, // Trùng username
          password: 'Password123!',
        }),
      });

      expect([400, 409]).toContain(res.status);
      expect(res.data.success).toBe(false);
      expect(res.data.message).toBeTruthy();
    });

    it('A5. Gọi API quản trị hoặc API dữ liệu nhạy cảm khi chưa đăng nhập: bị từ chối (HTTP 401)', async () => {
      const resUsers = await apiRequest('/users');
      expect(resUsers.status).toBe(401);

      const resAudit = await apiRequest('/audit-logs');
      expect(resAudit.status).toBe(401);

      const resStats = await apiRequest('/dashboard/stats');
      expect(resStats.status).toBe(401);

      const resInvoices = await apiRequest('/invoices');
      expect(resInvoices.status).toBe(401);
    });
  });

  // --- NHÓM B: CUSTOMER ĐÃ ĐĂNG NHẬP ---
  describe('Nhóm B. CUSTOMER đã đăng nhập (Authenticated Customer)', () => {
    beforeAll(async () => {
      // Đăng nhập tài khoản kiểm thử khachhang01
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'khachhang01',
          password: 'khoa12345',
        }),
      });

      if (res.status === 200 && res.data.success) {
        customerToken = res.data.data.token;
        customerId = res.data.data.user.customerId;
      }
    });

    it('B1. Đăng nhập bằng khachhang01 thành công, token chứa đúng role CUSTOMER', () => {
      expect(customerToken).toBeTruthy();
      const decoded = verifyToken(customerToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.role).toBe('CUSTOMER');
      expect(decoded?.username).toBe('khachhang01');
      expect(decoded?.customerId).toBeDefined();
    });

    it('B2. Xem thông tin cá nhân của chính mình (GET /api/auth/me): thành công (HTTP 200)', async () => {
      const res = await apiRequest('/auth/me', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.username).toBe('khachhang01');
      expect(res.data.data.role).toBe('CUSTOMER');
    });

    it('B3. Cập nhật thông tin cá nhân của chính mình (PUT /api/auth/profile): thành công (HTTP 200)', async () => {
      const res = await apiRequest('/auth/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          fullName: 'Nguyễn Văn Khách Hàng (Updated)',
          email: 'khachhang01@gmail.com',
          address: '456 Lê Duẩn, Quận 1, TP.HCM',
        }),
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.fullName).toBe('Nguyễn Văn Khách Hàng (Updated)');
    });

    it('B4. Không xem hoặc sửa thông tin cá nhân của khách hàng khác: bị từ chối (HTTP 403 Forbidden)', async () => {
      // Giả sử khachhang01 có customerId là 6, thử truy cập customer id = 1
      const otherCustomerId = customerId === 1 ? 2 : 1;
      const resGetOther = await apiRequest(`/customers/${otherCustomerId}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      expect([403]).toContain(resGetOther.status);

      const resPutOther = await apiRequest(`/customers/${otherCustomerId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          fullName: 'Đổi trộm thông tin người khác',
        }),
      });

      expect([403]).toContain(resPutOther.status);
    });

    it('B5. Không truy cập API quản lý người dùng nội bộ (/api/users): bị từ chối (HTTP 403)', async () => {
      const res = await apiRequest('/users', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('B6. Không truy cập API nhật ký kiểm toán (/api/audit-logs): bị từ chối (HTTP 403)', async () => {
      const res = await apiRequest('/audit-logs', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('B7. Không truy cập thống kê dashboard (/api/dashboard/stats): bị từ chối (HTTP 403)', async () => {
      const res = await apiRequest('/dashboard/stats', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('B8. Không được tự ý duyệt trạng thái lịch hẹn hoặc thanh toán hóa đơn: bị từ chối (HTTP 403)', async () => {
      // Cố tình gọi PATCH /api/appointments/1/status
      const resApt = await apiRequest('/appointments/1/status', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ status: 'DA_XAC_NHAN' }),
      });
      expect(resApt.status).toBe(403);

      // Cố tình gọi PATCH /api/invoices/1/pay
      const resInv = await apiRequest('/invoices/1/pay', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ paymentMethod: 'TIEN_MAT' }),
      });
      expect(resInv.status).toBe(403);
    });
  });

  // --- NHÓM C: STAFF VÀ ADMIN ---
  describe('Nhóm C. STAFF và ADMIN (Internal Staff & Administrator)', () => {
    beforeAll(async () => {
      // Đăng nhập Staff
      const resStaff = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'staff1',
          password: 'Staff@123',
        }),
      });
      if (resStaff.status === 200 && resStaff.data.success) {
        staffToken = resStaff.data.data.token;
      }

      // Đăng nhập Admin
      const resAdmin = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          password: 'Admin@123',
        }),
      });
      if (resAdmin.status === 200 && resAdmin.data.success) {
        adminToken = resAdmin.data.data.token;
      }
    });

    it('C1. Đăng nhập STAFF hiện tại vẫn hoạt động tốt, nhận diện role STAFF', () => {
      expect(staffToken).toBeTruthy();
      const decoded = verifyToken(staffToken);
      expect(decoded?.role).toBe('STAFF');
      expect(decoded?.username).toBe('staff1');
    });

    it('C2. Đăng nhập ADMIN hiện tại vẫn hoạt động tốt, nhận diện role ADMIN', () => {
      expect(adminToken).toBeTruthy();
      const decoded = verifyToken(adminToken);
      expect(decoded?.role).toBe('ADMIN');
      expect(decoded?.username).toBe('admin');
    });

    it('C3. STAFF không được truy cập chức năng nhạy cảm của ADMIN (/api/audit-logs): bị từ chối (HTTP 403)', async () => {
      const res = await apiRequest('/audit-logs', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('C4. ADMIN được truy cập đầy đủ các chức năng quản trị (/api/audit-logs, /api/users, /api/dashboard/stats): thành công (HTTP 200)', async () => {
      const resAudit = await apiRequest('/audit-logs', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(resAudit.status).toBe(200);

      const resUsers = await apiRequest('/users', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(resUsers.status).toBe(200);

      const resStats = await apiRequest('/dashboard/stats', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(resStats.status).toBe(200);
    });

    it('C5. STAFF được truy cập các nghiệp vụ lễ tân (quản lý khách hàng, quản lý thú cưng, lịch hẹn): thành công (HTTP 200)', async () => {
      const resCustomers = await apiRequest('/customers', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(resCustomers.status).toBe(200);

      const resAppointments = await apiRequest('/appointments', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(resAppointments.status).toBe(200);
    });
  });

  // --- NHÓM D: LOÀI THÚ CƯNG MỚI (CHIM, CÁ) VÀ PHƯƠNG THỨC THANH TOÁN (TIỀN MẶT, CHUYỂN KHOẢN, MÃ QR) ---
  describe('Nhóm D. Loài thú cưng mới (Chim, Cá) và 3 Phương thức thanh toán', () => {
    let testInvoiceId: number | null = null;

    it('D1. Lọc thú cưng theo loài Chim: trả về HTTP 200 và danh sách loài Chim', async () => {
      const res = await apiRequest('/pets/public?species=Chim');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBeGreaterThanOrEqual(1);
      for (const pet of res.data.data) {
        expect(pet.species).toBe('Chim');
      }
    });

    it('D2. Lọc thú cưng theo loài Cá: trả về HTTP 200 và danh sách loài Cá', async () => {
      const res = await apiRequest('/pets/public?species=Cá');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBeGreaterThanOrEqual(1);
      for (const pet of res.data.data) {
        expect(pet.species).toBe('Cá');
      }
    });

    it('D3. Nhân viên tạo thú cưng mới loài Chim hoặc Cá thành công (HTTP 201)', async () => {
      const petCodeTest = `PET_TEST_${Date.now().toString().slice(-4)}`;
      const res = await apiRequest('/pets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          petCode: petCodeTest,
          name: 'Chim Khuyên Vàng',
          species: 'Chim',
          breed: 'Vành khuyên',
          gender: 'Đực',
          healthStatus: 'Khỏe mạnh, giọng hót hay',
          notes: 'Thú cưng thử nghiệm loài chim',
          isPublic: true,
          price: 200000,
        }),
      });
      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.data.species).toBe('Chim');
    });

    it('D4. Lập hóa đơn mới với phương thức MA_QR: backend tự tính tổng tiền, lưu phương thức MA_QR (HTTP 201)', async () => {
      const res = await apiRequest('/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          customerId: 1,
          petId: 1,
          paymentMethod: 'MA_QR',
          notes: 'Hóa đơn thử nghiệm thanh toán qua mã QR VietQR',
          items: [
            { serviceId: 1, quantity: 1 }, // unit_price = 150000
            { serviceId: 2, quantity: 1 }, // unit_price = 250000
          ],
        }),
      });
      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.data.payment_method).toBe('MA_QR');
      expect(res.data.data.status).toBe('CHUA_THANH_TOAN');
      // Tổng tiền do backend tính toán từ bảng services: 150.000 + 250.000 = 400.000
      expect(Number(res.data.data.total_amount)).toBe(400000);
      testInvoiceId = res.data.data.id;
    });

    it('D5. Khách hàng (CUSTOMER) KHÔNG thể tự ý xác nhận thanh toán hóa đơn: bị từ chối (HTTP 403)', async () => {
      expect(testInvoiceId).not.toBeNull();
      const res = await apiRequest(`/invoices/${testInvoiceId}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ paymentMethod: 'MA_QR' }),
      });
      expect(res.status).toBe(403);
    });

    it('D6. Nhân viên thu ngân (STAFF) xác nhận đã nhận chuyển khoản QR thành công (HTTP 200)', async () => {
      expect(testInvoiceId).not.toBeNull();
      const res = await apiRequest(`/invoices/${testInvoiceId}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ paymentMethod: 'MA_QR' }),
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.status).toBe('DA_THANH_TOAN');
      expect(res.data.data.payment_method).toBe('MA_QR');
      expect(res.data.data.paid_at).not.toBeNull();
    });

    it('D7. Lấy chi tiết hóa đơn: hiển thị đúng phương thức MA_QR và trạng thái DA_THANH_TOAN (HTTP 200)', async () => {
      expect(testInvoiceId).not.toBeNull();
      const res = await apiRequest(`/invoices/${testInvoiceId}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.payment_method).toBe('MA_QR');
      expect(res.data.data.status).toBe('DA_THANH_TOAN');
    });

    it('D8. Lập hóa đơn và thanh toán với phương thức QR_DEMO (thanh toán mô phỏng): thành công (HTTP 201 & HTTP 200)', async () => {
      const resCreate = await apiRequest('/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          customerId: 1,
          petId: 1,
          paymentMethod: 'QR_DEMO',
          notes: 'Hóa đơn thử nghiệm phương thức QR_DEMO mô phỏng',
          items: [{ serviceId: 1, quantity: 1 }],
        }),
      });
      expect(resCreate.status).toBe(201);
      expect(resCreate.data.data.payment_method).toBe('QR_DEMO');
      expect(resCreate.data.data.status).toBe('CHUA_THANH_TOAN');
      const demoInvId = resCreate.data.data.id;

      // Nhân viên hoàn tất thanh toán demo
      const resPay = await apiRequest(`/invoices/${demoInvId}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ paymentMethod: 'QR_DEMO' }),
      });
      expect(resPay.status).toBe(200);
      expect(resPay.data.success).toBe(true);
      expect(resPay.data.data.status).toBe('DA_THANH_TOAN');
      expect(resPay.data.data.payment_method).toBe('QR_DEMO');
      expect(resPay.data.data.paid_at).not.toBeNull();
    });
  });

  // --- NHÓM E: BỔ SUNG CHỨC NĂNG MUA THÚ CƯNG TRỰC TUYẾN CHO KHÁCH HÀNG ---
  describe('Nhóm E. Mua Thú Cưng Trực Tuyến & Xử Lý Đơn Hàng (Online Pet Orders)', () => {
    let orderCustomer1Token: string = '';
    let orderCustomer2Token: string = '';
    let customer1Id: number = 0;
    let customer2Id: number = 0;
    let targetPetForSale: any = null;
    let targetPetForCancel: any = null;
    let testOrderId: number | null = null;
    let cancelOrderId: number | null = null;

    beforeAll(async () => {
      // 1. Đăng nhập Customer 1 (khachhang01)
      const resC1 = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'khachhang01',
          password: 'khoa12345',
        }),
      });
      if (resC1.status === 200 && resC1.data.success) {
        orderCustomer1Token = resC1.data.data.token;
        customer1Id = resC1.data.data.user.customerId;
      }

      // 2. Tạo hoặc đăng nhập Customer 2 để kiểm thử phân quyền và chống mua trùng
      const c2User = `buyer2_${uniqueSuffix}`;
      const resReg2 = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Khách Hàng Thứ Hai',
          phone: `0922${uniqueSuffix.padStart(6, '0')}`,
          email: `buyer2_${uniqueSuffix}@example.com`,
          username: c2User,
          password: 'Password123!',
        }),
      });

      if ([200, 201].includes(resReg2.status)) {
        const resC2Login = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: c2User,
            password: 'Password123!',
          }),
        });
        if (resC2Login.status === 200 && resC2Login.data.success) {
          orderCustomer2Token = resC2Login.data.data.token;
          customer2Id = resC2Login.data.data.user.customerId;
        }
      }

      // 3. Lấy danh sách thú cưng công khai đang bán
      const resPublic = await apiRequest('/pets/public');
      if (resPublic.status === 200 && resPublic.data.success && Array.isArray(resPublic.data.data)) {
        const saleable = resPublic.data.data.filter(
          (p: any) => p.status === 'SAN_SANG' && Number(p.price) > 0
        );
        if (saleable.length > 0) {
          targetPetForSale = saleable[0];
        }
        if (saleable.length > 1) {
          targetPetForCancel = saleable[1];
        } else {
          targetPetForCancel = saleable[0];
        }
      }
    });

    it('E1. CUSTOMER đặt mua trực tuyến thú cưng đang bán (SAN_SANG, price > 0): thành công (HTTP 201)', async () => {
      expect(targetPetForSale).not.toBeNull();
      const res = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${orderCustomer1Token}` },
        body: JSON.stringify({
          petId: targetPetForSale.id,
          paymentMethod: 'TIEN_MAT',
          shippingName: 'Nguyễn Văn Test',
          shippingPhone: '0988001122',
          shippingAddress: '123 Đường Hoa Hồng, Phường 1, Quận 3, TP.HCM',
          notes: 'Giao bé vào buổi sáng giúp mình nhé',
          // Client cố ý truyền giá giả rẻ hơn giá niêm yết để kiểm tra backend
          clientPrice: 1000,
        }),
      });

      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.data.order_code).toMatch(/^ORD/);
      expect(res.data.data.pet_id).toBe(targetPetForSale.id);
      expect(res.data.data.order_status).toBe('CHO_XAC_NHAN');
      expect(res.data.data.payment_status).toBe('CHUA_THANH_TOAN');
      expect(res.data.data.payment_method).toBe('TIEN_MAT');
      // Giá bán PHẢI được lấy từ DB backend, không chấp nhận giá rẻ của client
      expect(Number(res.data.data.total_amount)).toBe(Number(targetPetForSale.price));

      testOrderId = res.data.data.id;

      // Kiểm tra trạng thái thú cưng trong DB đã chuyển sang DA_DAT (giữ chỗ)
      const resPetCheck = await apiRequest(`/pets/public/${targetPetForSale.id}`);
      expect(resPetCheck.status).toBe(200);
      expect(resPetCheck.data.data.status).toBe('DA_DAT');
    });

    it('E2. Chống mua trùng (Concurrency / Duplicate Prevention): Khách hàng thứ hai cố đặt mua cùng một thú cưng đã được giữ chỗ (DA_DAT) bị từ chối (HTTP 400)', async () => {
      expect(targetPetForSale).not.toBeNull();
      const res = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${orderCustomer2Token}` },
        body: JSON.stringify({
          petId: targetPetForSale.id,
          paymentMethod: 'CHUYEN_KHOAN',
          shippingName: 'Người Mua Thứ Hai',
          shippingPhone: '0912345678',
          shippingAddress: '456 Đường Lê Lợi, TP.HCM',
        }),
      });

      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
      expect(res.data.message).toMatch(/(không còn khả dụng|không sẵn sàng|đã có người đặt|đã được đặt|đã bán)/i);
    });

    it('E3. Cố tình mua thú cưng chưa có giá bán (Milu, price = 0): bị từ chối đúng cách (HTTP 400)', async () => {
      // Tìm bé có price = 0
      const resPublic = await apiRequest('/pets/public');
      const unpricedPet = resPublic.data?.data?.find((p: any) => Number(p.price) === 0);
      if (unpricedPet) {
        const res = await apiRequest('/orders', {
          method: 'POST',
          headers: { Authorization: `Bearer ${orderCustomer1Token}` },
          body: JSON.stringify({
            petId: unpricedPet.id,
            paymentMethod: 'TIEN_MAT',
            shippingName: 'Khách Thử Nghiệm',
            shippingPhone: '0988001122',
            shippingAddress: 'Hà Nội',
          }),
        });

        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.message).toMatch(/(chưa có giá bán|không thuộc danh mục mở bán|không thuộc diện bán lẻ)/i);
      }
    });

    it('E4. Khách hàng (CUSTOMER) chỉ xem được danh sách đơn hàng của chính mình (HTTP 200, scoped customer_id)', async () => {
      const res = await apiRequest('/orders', {
        headers: { Authorization: `Bearer ${orderCustomer1Token}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
      // Mọi đơn hàng trả về đều phải thuộc về customer1Id
      for (const ord of res.data.data) {
        expect(ord.customer_id).toBe(customer1Id);
      }
    });

    it('E5. Khách hàng (CUSTOMER) KHÔNG thể xem đơn hàng của khách hàng khác qua ID: bị từ chối (HTTP 403)', async () => {
      expect(testOrderId).not.toBeNull();
      // Customer 2 cố tình truy cập đơn hàng của Customer 1
      const res = await apiRequest(`/orders/${testOrderId}`, {
        headers: { Authorization: `Bearer ${orderCustomer2Token}` },
      });

      expect(res.status).toBe(403);
      expect(res.data.success).toBe(false);
    });

    it('E6. Khách hàng (CUSTOMER) KHÔNG thể tự ý thay đổi trạng thái đơn hàng hoặc tự xác nhận đã thanh toán: bị từ chối (HTTP 403)', async () => {
      expect(testOrderId).not.toBeNull();
      // Cố tình sửa trạng thái đơn hàng sang HOAN_THANH
      const resStatus = await apiRequest(`/orders/${testOrderId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${orderCustomer1Token}` },
        body: JSON.stringify({ orderStatus: 'HOAN_THANH' }),
      });
      expect(resStatus.status).toBe(403);

      // Cố tình tự đánh dấu đã thanh toán
      const resPay = await apiRequest(`/orders/${testOrderId}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${orderCustomer1Token}` },
        body: JSON.stringify({ paymentMethod: 'TIEN_MAT' }),
      });
      expect(resPay.status).toBe(403);
    });

    it('E7. CUSTOMER đặt mua với phương thức thanh toán QR_DEMO: lưu đúng QR_DEMO và trạng thái CHUA_THANH_TOAN (HTTP 201)', async () => {
      // Tìm một thú cưng đang bán khác để đặt mua bằng QR Demo
      const resPublic = await apiRequest('/pets/public');
      const anotherPet = resPublic.data?.data?.find(
        (p: any) => p.status === 'SAN_SANG' && Number(p.price) > 0
      );

      if (anotherPet) {
        const resQrOrder = await apiRequest('/orders', {
          method: 'POST',
          headers: { Authorization: `Bearer ${orderCustomer2Token}` },
          body: JSON.stringify({
            petId: anotherPet.id,
            paymentMethod: 'QR_DEMO',
            shippingName: 'Khách QR Demo',
            shippingPhone: '0933445566',
            shippingAddress: 'Quận 1, TP.HCM',
            notes: 'Thanh toán mô phỏng demo',
          }),
        });

        expect(resQrOrder.status).toBe(201);
        expect(resQrOrder.data.success).toBe(true);
        expect(resQrOrder.data.data.payment_method).toBe('QR_DEMO');
        expect(resQrOrder.data.data.payment_status).toBe('CHUA_THANH_TOAN');
        cancelOrderId = resQrOrder.data.data.id;
      }
    });

    it('E8. Nhân viên (STAFF) có thể xem toàn bộ đơn hàng trong hệ thống (HTTP 200)', async () => {
      const res = await apiRequest('/orders', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('E9. Nhân viên (STAFF) cập nhật trạng thái đơn hàng (DA_XAC_NHAN, DANG_GIAO): thành công (HTTP 200)', async () => {
      expect(testOrderId).not.toBeNull();
      // Bước 1: STAFF xác nhận đơn
      const resConfirm = await apiRequest(`/orders/${testOrderId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ orderStatus: 'DA_XAC_NHAN' }),
      });
      expect(resConfirm.status).toBe(200);
      expect(resConfirm.data.data.order_status).toBe('DA_XAC_NHAN');

      // Bước 2: STAFF chuyển sang giao bé
      const resShip = await apiRequest(`/orders/${testOrderId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ orderStatus: 'DANG_GIAO' }),
      });
      expect(resShip.status).toBe(200);
      expect(resShip.data.data.order_status).toBe('DANG_GIAO');
    });

    it('E10. Nhân viên (STAFF) xác nhận đã nhận tiền thanh toán đơn hàng (HTTP 200)', async () => {
      expect(testOrderId).not.toBeNull();
      const resPay = await apiRequest(`/orders/${testOrderId}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ paymentMethod: 'TIEN_MAT' }),
      });

      expect(resPay.status).toBe(200);
      expect(resPay.data.success).toBe(true);
      expect(resPay.data.data.payment_status).toBe('DA_THANH_TOAN');
      expect(resPay.data.data.paid_at).not.toBeNull();
    });

    it('E11. Nhân viên (STAFF) hoàn tất đơn hàng (HOAN_THANH): thú cưng chuyển sang DA_CO_CHU và gán chủ sở hữu cho khách (HTTP 200)', async () => {
      expect(testOrderId).not.toBeNull();
      const resComplete = await apiRequest(`/orders/${testOrderId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ orderStatus: 'HOAN_THANH' }),
      });

      expect(resComplete.status).toBe(200);
      expect(resComplete.data.data.order_status).toBe('HOAN_THANH');

      // Kiểm tra thú cưng: phải chuyển sang DA_CO_CHU và customer_id = customer1Id
      const resStaffPet = await apiRequest(`/pets/${targetPetForSale.id}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(resStaffPet.status).toBe(200);
      expect(resStaffPet.data.data.status).toBe('DA_CO_CHU');
      expect(resStaffPet.data.data.customer_id).toBe(customer1Id);

      // Bé này tự động xuất hiện trong "Thú cưng của tôi" của khách hàng 1
      const resMyPets = await apiRequest('/pets/my-pets', {
        headers: { Authorization: `Bearer ${orderCustomer1Token}` },
      });
      expect(resMyPets.status).toBe(200);
      const ownedPet = resMyPets.data.data.find((p: any) => p.id === targetPetForSale.id);
      expect(ownedPet).toBeDefined();
    });

    it('E12. Hủy đơn hàng (DA_HUY) bởi STAFF: thú cưng tự động hoàn về trạng thái SAN_SANG để khách khác có thể mua', async () => {
      if (cancelOrderId) {
        // Lấy thông tin đơn hàng này để biết pet_id
        const resOrd = await apiRequest(`/orders/${cancelOrderId}`, {
          headers: { Authorization: `Bearer ${staffToken}` },
        });
        const petId = resOrd.data.data.pet_id;

        // STAFF hủy đơn
        const resCancel = await apiRequest(`/orders/${cancelOrderId}/status`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify({ orderStatus: 'DA_HUY', notes: 'Khách đổi ý muốn đón bé khác' }),
        });

        expect(resCancel.status).toBe(200);
        expect(resCancel.data.data.order_status).toBe('DA_HUY');

        // Kiểm tra thú cưng đã được hoàn về trạng thái SAN_SANG
        const resPet = await apiRequest(`/pets/public/${petId}`);
        expect(resPet.status).toBe(200);
        expect(resPet.data.data.status).toBe('SAN_SANG');
      }
    });
  });
});

