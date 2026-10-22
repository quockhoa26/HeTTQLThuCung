import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { createAuditLog } from '../utils/audit.js';

const serviceSchema = z.object({
  name: z.string().min(2, 'Tên dịch vụ phải có ít nhất 2 ký tự').max(100),
  description: z.string().optional().or(z.literal('')),
  price: z.number().nonnegative('Giá dịch vụ không được là số âm'),
  durationMinutes: z.number().int().positive('Thời lượng dịch vụ phải lớn hơn 0 phút'),
  isActive: z.boolean().optional(),
});

export async function getServices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    let sql = 'SELECT * FROM services';
    if (activeOnly) {
      sql += ' WHERE is_active = TRUE';
    }
    sql += ' ORDER BY id ASC';

    const result = await query(sql);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getServiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await query('SELECT * FROM services WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ' });
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

export async function createService(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = serviceSchema.parse(req.body);

    const result = await query(
      `INSERT INTO services (name, description, price, duration_minutes, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        validated.name,
        validated.description || null,
        validated.price,
        validated.durationMinutes,
        validated.isActive !== undefined ? validated.isActive : true,
      ]
    );

    const created = result.rows[0];
    await createAuditLog(req.user?.id, 'CREATE', 'SERVICE', created.id, { name: created.name, price: created.price }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Thêm dịch vụ mới thành công',
      data: created,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateService(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const validated = serviceSchema.parse(req.body);

    const result = await query(
      `UPDATE services
       SET name = $1, description = $2, price = $3, duration_minutes = $4,
           is_active = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        validated.name,
        validated.description || null,
        validated.price,
        validated.durationMinutes,
        validated.isActive !== undefined ? validated.isActive : true,
        id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ cần cập nhật' });
      return;
    }

    await createAuditLog(req.user?.id, 'UPDATE', 'SERVICE', id, { name: validated.name }, req.ip);

    res.json({
      success: true,
      message: 'Cập nhật dịch vụ thành công',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleServiceStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    const result = await query(
      `UPDATE services
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ' });
      return;
    }

    const updated = result.rows[0];
    const statusText = updated.is_active ? 'Kích hoạt' : 'Tạm ngưng';

    await createAuditLog(req.user?.id, 'TOGGLE_STATUS', 'SERVICE', id, { is_active: updated.is_active }, req.ip);

    res.json({
      success: true,
      message: `${statusText} dịch vụ thành công`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteService(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    // Check if service is referenced in appointments or invoices
    const usedInAppointments = await query('SELECT id FROM appointment_services WHERE service_id = $1 LIMIT 1', [id]);
    const usedInInvoices = await query('SELECT id FROM invoice_items WHERE service_id = $1 LIMIT 1', [id]);

    if (usedInAppointments.rows.length > 0 || usedInInvoices.rows.length > 0) {
      // Soft-deactivate instead of hard delete to preserve historical integrity
      await query('UPDATE services SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      await createAuditLog(req.user?.id, 'DEACTIVATE_SERVICE', 'SERVICE', id, { reason: 'Dịch vụ đã có dữ liệu sử dụng' }, req.ip);

      res.json({
        success: true,
        message: 'Dịch vụ đã từng được sử dụng trong lịch hẹn/hóa đơn nên hệ thống đã tự động chuyển sang trạng thái "Ngừng cung cấp" để bảo đảm toàn vẹn dữ liệu.',
      });
      return;
    }

    const result = await query('DELETE FROM services WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ' });
      return;
    }

    await createAuditLog(req.user?.id, 'DELETE', 'SERVICE', id, { name: result.rows[0].name }, req.ip);

    res.json({
      success: true,
      message: 'Xóa dịch vụ thành công',
    });
  } catch (error) {
    next(error);
  }
}
