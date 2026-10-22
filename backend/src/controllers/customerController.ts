import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { createAuditLog } from '../utils/audit.js';

const customerSchema = z.object({
  fullName: z.string().min(2, 'Họ và tên khách hàng phải có ít nhất 2 ký tự').max(100),
  phone: z.string().regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Địa chỉ email không hợp lệ').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export async function getCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = (req.query.search as string) || '';
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      whereClause = `WHERE c.full_name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.email ILIKE $${params.length}`;
    }

    const countQuery = `SELECT COUNT(*) FROM customers c ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM pets p WHERE p.customer_id = c.id) as pet_count
      FROM customers c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const result = await query(dataQuery, dataParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    // Kiểm tra quyền: CUSTOMER chỉ được xem thông tin của chính mình
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== id) {
      res.status(403).json({
        success: false,
        message: 'Quyền truy cập bị từ chối. Bạn không được phép xem thông tin của khách hàng khác.',
      });
      return;
    }

    const result = await query('SELECT * FROM customers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thông tin khách hàng' });
      return;
    }

    const customer = result.rows[0];

    // Get pets of this customer
    const petsResult = await query(
      'SELECT * FROM pets WHERE customer_id = $1 ORDER BY created_at DESC',
      [id]
    );
    customer.pets = petsResult.rows;

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = customerSchema.parse(req.body);

    // Check duplicate phone
    const existing = await query('SELECT id FROM customers WHERE phone = $1', [validated.phone]);
    if (existing.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Số điện thoại này đã được đăng ký cho khách hàng khác trong hệ thống.',
      });
      return;
    }

    const result = await query(
      `INSERT INTO customers (full_name, phone, email, address, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [validated.fullName, validated.phone, validated.email || null, validated.address || null, validated.notes || null]
    );

    const created = result.rows[0];
    await createAuditLog(req.user?.id, 'CREATE', 'CUSTOMER', created.id, { fullName: created.full_name }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Thêm khách hàng mới thành công',
      data: created,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    // Kiểm tra quyền: CUSTOMER chỉ được sửa thông tin của chính mình
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== id) {
      res.status(403).json({
        success: false,
        message: 'Quyền truy cập bị từ chối. Bạn không được phép chỉnh sửa thông tin của khách hàng khác.',
      });
      return;
    }

    const validated = customerSchema.parse(req.body);

    // Check duplicate phone for other customer
    const existing = await query('SELECT id FROM customers WHERE phone = $1 AND id != $2', [validated.phone, id]);
    if (existing.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Số điện thoại này đã thuộc về một khách hàng khác.',
      });
      return;
    }

    const result = await query(
      `UPDATE customers
       SET full_name = $1, phone = $2, email = $3, address = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [validated.fullName, validated.phone, validated.email || null, validated.address || null, validated.notes || null, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng cần cập nhật' });
      return;
    }

    await createAuditLog(req.user?.id, 'UPDATE', 'CUSTOMER', id, { fullName: validated.fullName }, req.ip);

    res.json({
      success: true,
      message: 'Cập nhật thông tin khách hàng thành công',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    // Check if customer has active appointments
    const activeAppointments = await query(
      `SELECT id FROM appointments WHERE customer_id = $1 AND status IN ('CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DANG_THUC_HIEN')`,
      [id]
    );

    if (activeAppointments.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Không thể xóa khách hàng đang có lịch hẹn chờ hoặc đang thực hiện.',
      });
      return;
    }

    const result = await query('DELETE FROM customers WHERE id = $1 RETURNING id, full_name', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
      return;
    }

    await createAuditLog(req.user?.id, 'DELETE', 'CUSTOMER', id, { name: result.rows[0].full_name }, req.ip);

    res.json({
      success: true,
      message: 'Xóa khách hàng thành công',
    });
  } catch (error) {
    next(error);
  }
}
