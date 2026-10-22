import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, pool } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { createAuditLog } from '../utils/audit.js';

// In-memory sliding window rate limiter for registration (max 10 requests / 15 minutes per IP)
const registrationAttempts = new Map<string, { count: number; resetTime: number }>();

function checkRegistrationRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;
  const record = registrationAttempts.get(ip);
  if (!record || now > record.resetTime) {
    registrationAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxAttempts) {
    return false;
  }
  record.count++;
  return true;
}

const loginSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập không được để trống'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'Họ và tên phải có ít nhất 2 ký tự').max(100),
  phone: z.string().regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ (cần 10 chữ số)').max(20),
  email: z.string().email('Địa chỉ email không đúng định dạng').max(100),
  username: z
    .string()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, chữ số và dấu gạch dưới'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  address: z.string().optional().or(z.literal('')),
  role: z.string().optional(),
});

const profileUpdateSchema = z.object({
  fullName: z.string().min(2, 'Họ và tên phải có ít nhất 2 ký tự').max(100),
  email: z.string().email('Địa chỉ email không đúng định dạng').max(100),
  phone: z.string().regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ').max(20).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

/**
 * Đăng nhập người dùng (hỗ trợ ADMIN, STAFF, CUSTOMER)
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = loginSchema.parse(req.body);
    const { username, password } = validated;

    const result = await query(
      `SELECT u.id, u.username, u.password_hash, u.full_name, u.email, u.is_active, u.customer_id, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác',
      });
      return;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác',
      });
      return;
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name,
      customerId: user.customer_id,
    });

    await createAuditLog(user.id, 'LOGIN', 'USER', user.id, { username: user.username }, req.ip);

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          customerId: user.customer_id,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Đăng ký tài khoản Khách hàng (vai trò cố định CUSTOMER)
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRegistrationRateLimit(clientIp)) {
      res.status(429).json({
        success: false,
        message: 'Bạn đã thử đăng ký quá nhiều lần trong thời gian ngắn. Vui lòng đợi 15 phút sau đó thử lại.',
      });
      return;
    }

    // Bảo mật: Nếu client cố tình gửi role khác CUSTOMER để nâng quyền, từ chối ngay lập tức
    if (req.body.role && req.body.role !== 'CUSTOMER') {
      res.status(400).json({
        success: false,
        message: 'Bạn không được phép tự gán quyền Quản trị hoặc Nhân viên khi đăng ký tài khoản khách hàng.',
      });
      return;
    }

    const validated = registerSchema.parse(req.body);
    const username = validated.username.trim();
    const email = validated.email.trim().toLowerCase();
    const phone = validated.phone.trim();
    const fullName = validated.fullName.trim();
    const address = validated.address?.trim() || null;

    // 1. Kiểm tra trùng username
    const checkUsername = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (checkUsername.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: `Tên đăng nhập "${username}" đã được sử dụng. Vui lòng chọn tên đăng nhập khác.`,
      });
      return;
    }

    // 2. Kiểm tra trùng email
    const checkEmail = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: `Email "${email}" đã được đăng ký tài khoản. Vui lòng sử dụng email khác hoặc đăng nhập.`,
      });
      return;
    }

    // 3. Kiểm tra trùng số điện thoại trong danh sách khách hàng
    const checkPhone = await query('SELECT id FROM customers WHERE phone = $1', [phone]);
    if (checkPhone.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: `Số điện thoại "${phone}" đã được đăng ký trong hệ thống. Vui lòng sử dụng số điện thoại khác.`,
      });
      return;
    }

    // 4. Lấy role_id của CUSTOMER
    const roleResult = await query("SELECT id FROM roles WHERE name = 'CUSTOMER'");
    let customerRoleId: number;
    if (roleResult.rows.length === 0) {
      const newRole = await query(
        "INSERT INTO roles (name, description) VALUES ('CUSTOMER', 'Khách hàng sử dụng dịch vụ') RETURNING id"
      );
      customerRoleId = newRole.rows[0].id;
    } else {
      customerRoleId = roleResult.rows[0].id;
    }

    // 5. Băm mật khẩu bằng bcrypt với 10 rounds
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // 6. Thực hiện Transaction tạo khách hàng và tài khoản
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const customerInsert = await client.query(
        `INSERT INTO customers (full_name, phone, email, address, notes)
         VALUES ($1, $2, $3, $4, 'Khách hàng đăng ký trực tuyến')
         RETURNING id`,
        [fullName, phone, email, address]
      );
      const customerId = customerInsert.rows[0].id;

      const userInsert = await client.query(
        `INSERT INTO users (username, password_hash, full_name, email, role_id, customer_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING id, username, full_name, email, role_id, customer_id, is_active, created_at`,
        [username, passwordHash, fullName, email, customerRoleId, customerId]
      );
      const newUser = userInsert.rows[0];

      await client.query('COMMIT');

      await createAuditLog(
        newUser.id,
        'REGISTER',
        'USER',
        newUser.id,
        { username: newUser.username, role: 'CUSTOMER', customerId },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản khách hàng thành công. Bạn có thể đăng nhập ngay bây giờ.',
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            fullName: newUser.full_name,
            email: newUser.email,
            role: 'CUSTOMER',
            customerId,
          },
        },
      });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy thông tin tài khoản hiện tại (kèm thông tin khách hàng nếu có)
 */
export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      return;
    }

    const result = await query(
      `SELECT u.id, u.username, u.full_name, u.email, u.customer_id, r.name as role,
              c.phone, c.address, c.notes as customer_notes
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN customers c ON u.customer_id = c.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài khoản' });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cập nhật thông tin cá nhân của người dùng hiện tại
 */
export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      return;
    }

    const validated = profileUpdateSchema.parse(req.body);
    const fullName = validated.fullName.trim();
    const email = validated.email.trim().toLowerCase();
    const phone = validated.phone?.trim() || null;
    const address = validated.address?.trim() || null;

    // Check duplicate email for another user
    const checkEmail = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
    if (checkEmail.rows.length > 0) {
      res.status(400).json({ success: false, message: 'Email này đã được tài khoản khác sử dụng.' });
      return;
    }

    // If has customer_id, check duplicate phone
    if (phone && req.user.customerId) {
      const checkPhone = await query('SELECT id FROM customers WHERE phone = $1 AND id != $2', [phone, req.user.customerId]);
      if (checkPhone.rows.length > 0) {
        res.status(400).json({ success: false, message: 'Số điện thoại này đã được khách hàng khác sử dụng.' });
        return;
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE users SET full_name = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [fullName, email, req.user.id]
      );

      if (req.user.customerId) {
        await client.query(
          'UPDATE customers SET full_name = $1, email = $2, phone = COALESCE($3, phone), address = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
          [fullName, email, phone, address, req.user.customerId]
        );
      }

      await client.query('COMMIT');

      await createAuditLog(req.user.id, 'UPDATE_PROFILE', 'USER', req.user.id, { fullName, email }, req.ip);

      res.json({
        success: true,
        message: 'Cập nhật thông tin cá nhân thành công',
        data: {
          id: req.user.id,
          username: req.user.username,
          fullName,
          email,
          phone,
          address,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Đổi mật khẩu tài khoản
 */
export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      return;
    }

    const validated = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validated;

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, req.user.id]);

    await createAuditLog(req.user.id, 'CHANGE_PASSWORD', 'USER', req.user.id, {}, req.ip);

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Đăng xuất
 */
export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (req.user) {
    await createAuditLog(req.user.id, 'LOGOUT', 'USER', req.user.id, {}, req.ip);
  }
  res.json({
    success: true,
    message: 'Đăng xuất thành công',
  });
}
