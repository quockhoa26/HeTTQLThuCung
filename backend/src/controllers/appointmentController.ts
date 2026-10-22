import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { createAuditLog } from '../utils/audit.js';

const appointmentSchema = z.object({
  customerId: z.number().int().positive('Vui lòng chọn khách hàng'),
  petId: z.number().int().positive('Vui lòng chọn thú cưng'),
  staffId: z.number().int().positive('Vui lòng chọn nhân viên phụ trách').optional().nullable(),
  appointmentDate: z.string().min(1, 'Thời gian bắt đầu lịch hẹn không được để trống'),
  endTime: z.string().optional().or(z.literal('')),
  serviceIds: z.array(z.number().int().positive()).min(1, 'Vui lòng chọn ít nhất một dịch vụ cho lịch hẹn'),
  notes: z.string().optional().or(z.literal('')),
  status: z.enum(['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DANG_THUC_HIEN', 'HOAN_THANH', 'DA_HUY']).optional(),
});

export async function getAppointments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const date = req.query.date as string; // YYYY-MM-DD
    const status = req.query.status as string;
    const staffId = req.query.staffId ? parseInt(req.query.staffId as string, 10) : undefined;
    const petId = req.query.petId ? parseInt(req.query.petId as string, 10) : undefined;
    let customerId = req.query.customerId ? parseInt(req.query.customerId as string, 10) : undefined;
    const search = (req.query.search as string) || '';

    // Khách hàng chỉ xem được lịch hẹn của chính mình
    if (req.user?.role === 'CUSTOMER') {
      customerId = req.user.customerId || -1;
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (date) {
      params.push(date);
      conditions.push(`DATE(a.appointment_date) = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    if (staffId) {
      params.push(staffId);
      conditions.push(`a.staff_id = $${params.length}`);
    }

    if (petId) {
      params.push(petId);
      conditions.push(`a.pet_id = $${params.length}`);
    }

    if (customerId) {
      params.push(customerId);
      conditions.push(`a.customer_id = $${params.length}`);
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(a.appointment_code ILIKE $${params.length} OR c.full_name ILIKE $${params.length} OR p.name ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT a.*, 
             c.full_name as customer_name, c.phone as customer_phone,
             p.name as pet_name, p.species as pet_species, p.breed as pet_breed,
             u.full_name as staff_name,
             COALESCE(
               json_agg(
                 json_build_object('id', s.id, 'name', s.name, 'price', aps.price, 'duration', s.duration_minutes)
               ) FILTER (WHERE s.id IS NOT NULL), '[]'
             ) as services,
             COALESCE(SUM(aps.price), 0) as total_price
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN pets p ON a.pet_id = p.id
      LEFT JOIN users u ON a.staff_id = u.id
      LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
      LEFT JOIN services s ON aps.service_id = s.id
      ${whereClause}
      GROUP BY a.id, c.full_name, c.phone, p.name, p.species, p.breed, u.full_name
      ORDER BY a.appointment_date ASC
    `;

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAppointmentById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    const sql = `
      SELECT a.*, 
             c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email,
             p.name as pet_name, p.species as pet_species, p.breed as pet_breed, p.health_status,
             u.full_name as staff_name,
             COALESCE(
               json_agg(
                 json_build_object('id', s.id, 'name', s.name, 'price', aps.price, 'duration', s.duration_minutes)
               ) FILTER (WHERE s.id IS NOT NULL), '[]'
             ) as services,
             COALESCE(SUM(aps.price), 0) as total_price
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN pets p ON a.pet_id = p.id
      LEFT JOIN users u ON a.staff_id = u.id
      LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
      LEFT JOIN services s ON aps.service_id = s.id
      WHERE a.id = $1
      GROUP BY a.id, c.full_name, c.phone, c.email, p.name, p.species, p.breed, p.health_status, u.full_name
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
      return;
    }

    const apt = result.rows[0];

    // Khách hàng chỉ xem được lịch hẹn của chính mình
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== apt.customer_id) {
      res.status(403).json({
        success: false,
        message: 'Quyền truy cập bị từ chối. Bạn không được phép xem lịch hẹn của khách hàng khác.',
      });
      return;
    }

    res.json({
      success: true,
      data: apt,
    });
  } catch (error) {
    next(error);
  }
}

// Helper function to check staff schedule conflict
export async function checkStaffConflict(
  staffId: number,
  startDate: Date,
  endDate: Date,
  excludeAppointmentId?: number
): Promise<boolean> {
  let sql = `
    SELECT id, appointment_code, appointment_date, end_time
    FROM appointments
    WHERE staff_id = $1
      AND status NOT IN ('DA_HUY', 'HOAN_THANH')
      AND (
        (appointment_date < $3 AND end_time > $2)
      )
  `;
  const params: any[] = [staffId, startDate.toISOString(), endDate.toISOString()];

  if (excludeAppointmentId) {
    sql += ` AND id != $4`;
    params.push(excludeAppointmentId);
  }

  const result = await query(sql, params);
  return result.rows.length > 0;
}

export async function createAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const validated = appointmentSchema.parse(req.body);

    // Khách hàng tự đặt lịch: bắt buộc gán customerId của chính mình và trạng thái CHO_XAC_NHAN
    if (req.user?.role === 'CUSTOMER') {
      if (!req.user.customerId) {
        res.status(400).json({ success: false, message: 'Tài khoản của bạn chưa được liên kết thông tin khách hàng' });
        return;
      }
      validated.customerId = req.user.customerId;
      validated.status = 'CHO_XAC_NHAN';
    }

    const startDate = new Date(validated.appointmentDate);
    if (isNaN(startDate.getTime())) {
      res.status(400).json({ success: false, message: 'Thời gian bắt đầu không hợp lệ' });
      return;
    }

    // Fetch services to calculate total duration and get accurate prices
    const servicesRes = await client.query(
      'SELECT id, name, price, duration_minutes FROM services WHERE id = ANY($1::int[]) AND is_active = TRUE',
      [validated.serviceIds]
    );

    if (servicesRes.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Không tìm thấy dịch vụ hợp lệ hoặc dịch vụ đã ngừng cung cấp' });
      return;
    }

    // Determine end time
    let endDate: Date;
    if (validated.endTime) {
      endDate = new Date(validated.endTime);
      if (isNaN(endDate.getTime()) || endDate <= startDate) {
        res.status(400).json({ success: false, message: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
        return;
      }
    } else {
      const totalMinutes = servicesRes.rows.reduce((sum, s) => sum + (s.duration_minutes || 60), 0);
      endDate = new Date(startDate.getTime() + totalMinutes * 60000);
    }

    // Check staff conflict if staff is selected
    if (validated.staffId) {
      const isConflicting = await checkStaffConflict(validated.staffId, startDate, endDate);
      if (isConflicting) {
        res.status(400).json({
          success: false,
          message: 'Nhân viên phụ trách này đã có lịch hẹn khác trùng trong khung giờ này. Vui lòng chọn nhân viên khác hoặc đổi khung giờ.',
        });
        return;
      }
    }

    // Generate appointment code
    const dateStr = startDate.toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const appointmentCode = `APT${dateStr}-${randNum}`;

    await client.query('BEGIN');

    const aptResult = await client.query(
      `INSERT INTO appointments (appointment_code, customer_id, pet_id, staff_id, appointment_date, end_time, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        appointmentCode,
        validated.customerId,
        validated.petId,
        validated.staffId || null,
        startDate.toISOString(),
        endDate.toISOString(),
        validated.status || 'CHO_XAC_NHAN',
        validated.notes || null,
      ]
    );

    const appointment = aptResult.rows[0];

    // Insert appointment services
    for (const service of servicesRes.rows) {
      await client.query(
        `INSERT INTO appointment_services (appointment_id, service_id, price)
         VALUES ($1, $2, $3)`,
        [appointment.id, service.id, service.price]
      );
    }

    await client.query('COMMIT');

    await createAuditLog(
      req.user?.id,
      'CREATE',
      'APPOINTMENT',
      appointment.id,
      { code: appointmentCode, customerId: validated.customerId, petId: validated.petId },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Đặt lịch hẹn thành công',
      data: appointment,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function updateAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const id = parseInt(req.params.id, 10);
    const validated = appointmentSchema.parse(req.body);

    const startDate = new Date(validated.appointmentDate);
    let endDate: Date;

    const servicesRes = await client.query(
      'SELECT id, name, price, duration_minutes FROM services WHERE id = ANY($1::int[])',
      [validated.serviceIds]
    );

    if (validated.endTime) {
      endDate = new Date(validated.endTime);
      if (endDate <= startDate) {
        res.status(400).json({ success: false, message: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
        return;
      }
    } else {
      const totalMinutes = servicesRes.rows.reduce((sum, s) => sum + (s.duration_minutes || 60), 0);
      endDate = new Date(startDate.getTime() + totalMinutes * 60000);
    }

    if (validated.staffId) {
      const isConflicting = await checkStaffConflict(validated.staffId, startDate, endDate, id);
      if (isConflicting) {
        res.status(400).json({
          success: false,
          message: 'Nhân viên phụ trách này đã có lịch hẹn khác trùng trong khung giờ này.',
        });
        return;
      }
    }

    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE appointments
       SET customer_id = $1, pet_id = $2, staff_id = $3, appointment_date = $4,
           end_time = $5, status = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        validated.customerId,
        validated.petId,
        validated.staffId || null,
        startDate.toISOString(),
        endDate.toISOString(),
        validated.status || 'CHO_XAC_NHAN',
        validated.notes || null,
        id,
      ]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
      return;
    }

    // Update appointment services
    await client.query('DELETE FROM appointment_services WHERE appointment_id = $1', [id]);
    for (const service of servicesRes.rows) {
      await client.query(
        'INSERT INTO appointment_services (appointment_id, service_id, price) VALUES ($1, $2, $3)',
        [id, service.id, service.price]
      );
    }

    await client.query('COMMIT');

    await createAuditLog(req.user?.id, 'UPDATE', 'APPOINTMENT', id, { status: validated.status }, req.ip);

    res.json({
      success: true,
      message: 'Cập nhật lịch hẹn thành công',
      data: updateRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function updateAppointmentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;

    const validStatuses = ['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DANG_THUC_HIEN', 'HOAN_THANH', 'DA_HUY'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Trạng thái lịch hẹn không hợp lệ' });
      return;
    }

    const result = await query(
      `UPDATE appointments
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
      return;
    }

    await createAuditLog(req.user?.id, 'UPDATE_STATUS', 'APPOINTMENT', id, { newStatus: status }, req.ip);

    res.json({
      success: true,
      message: 'Cập nhật trạng thái lịch hẹn thành công',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}
