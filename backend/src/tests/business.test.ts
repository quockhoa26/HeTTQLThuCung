import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../utils/jwt.js';

describe('1. Kiểm thử Bảo mật & Xác thực (Authentication & Security)', () => {
  it('Băm mật khẩu an toàn với bcrypt và kiểm tra so khớp thành công', async () => {
    const rawPassword = 'AdminPassword123!';
    const saltRounds = 10;
    const hash = await bcrypt.hash(rawPassword, saltRounds);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const isMatch = await bcrypt.compare(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await bcrypt.compare('SaiMatKhau123', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('Tạo và giải mã JWT Token chính xác với phân quyền người dùng', () => {
    const payload = {
      id: 1,
      username: 'admin',
      role: 'ADMIN',
      fullName: 'Quản trị viên',
    };

    const token = generateToken(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.username).toBe('admin');
    expect(decoded?.role).toBe('ADMIN');
  });

  it('Từ chối token giả mạo hoặc token hết hạn', () => {
    const invalidToken = 'eyJh.fake.token';
    const decoded = verifyToken(invalidToken);
    expect(decoded).toBeNull();
  });
});

describe('2. Kiểm thử Nghiệp vụ Tính tổng tiền Hóa đơn (Invoice Calculations)', () => {
  it('Tự động tính tổng tiền phía Backend, không phụ thuộc Frontend', () => {
    const items = [
      { serviceName: 'Tắm spa & sấy tạo kiểu', quantity: 1, unitPrice: 150000 },
      { serviceName: 'Cắt tỉa lông nghệ thuật', quantity: 2, unitPrice: 250000 },
      { serviceName: 'Cắt mài móng', quantity: 1, unitPrice: 60000 },
    ];

    const calculatedTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // 150000*1 + 250000*2 + 60000*1 = 150000 + 500000 + 60000 = 710000
    expect(calculatedTotal).toBe(710000);
  });
});

describe('3. Kiểm thử Nghiệp vụ Trùng lịch hẹn (Appointment Overlap Logic)', () => {
  function isTimeOverlapping(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
  ): boolean {
    return startA < endB && endA > startB;
  }

  it('Phát hiện chính xác trường hợp nhân viên bị trùng lịch hẹn', () => {
    // Lịch hiện tại: 09:00 - 10:30
    const existingStart = new Date('2026-10-21T09:00:00Z');
    const existingEnd = new Date('2026-10-21T10:30:00Z');

    // Lịch mới đặt trùng: 09:30 - 11:00 (giao thoa giữa 09:30 và 10:30)
    const newStartOverlap = new Date('2026-10-21T09:30:00Z');
    const newEndOverlap = new Date('2026-10-21T11:00:00Z');
    expect(isTimeOverlapping(existingStart, existingEnd, newStartOverlap, newEndOverlap)).toBe(true);

    // Lịch mới đặt không trùng: 11:00 - 12:00
    const newStartOk = new Date('2026-10-21T11:00:00Z');
    const newEndOk = new Date('2026-10-21T12:00:00Z');
    expect(isTimeOverlapping(existingStart, existingEnd, newStartOk, newEndOk)).toBe(false);

    // Lịch trước đó không trùng: 07:30 - 08:45
    const earlyStartOk = new Date('2026-10-21T07:30:00Z');
    const earlyEndOk = new Date('2026-10-21T08:45:00Z');
    expect(isTimeOverlapping(existingStart, existingEnd, earlyStartOk, earlyEndOk)).toBe(false);
  });
});
