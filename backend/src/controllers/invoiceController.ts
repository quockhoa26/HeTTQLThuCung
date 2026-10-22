import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { createAuditLog } from '../utils/audit.js';

const invoiceItemSchema = z.object({
  serviceId: z.number().int().positive().optional().nullable(),
  serviceName: z.string().optional().or(z.literal('')),
  quantity: z.number().int().positive('Số lượng dịch vụ phải lớn hơn 0'),
  unitPrice: z.number().nonnegative('Đơn giá không được âm').optional(),
});

const createInvoiceSchema = z.object({
  appointmentId: z.number().int().positive().optional().nullable(),
  customerId: z.number().int().positive('Vui lòng chọn khách hàng'),
  petId: z.number().int().positive('Vui lòng chọn thú cưng'),
  items: z.array(invoiceItemSchema).min(1, 'Hóa đơn phải có ít nhất một dịch vụ/khoản phí'),
  paymentMethod: z.enum(['TIEN_MAT', 'CHUYEN_KHOAN', 'MA_QR', 'QR_DEMO']).optional(),
  status: z.enum(['CHUA_THANH_TOAN', 'DA_THANH_TOAN']).optional(),
  notes: z.string().optional().or(z.literal('')),
});

export async function getInvoices(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as string;
    let customerId = req.query.customerId ? parseInt(req.query.customerId as string, 10) : undefined;
    const search = (req.query.search as string) || '';
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = (page - 1) * limit;

    // Khách hàng chỉ xem được hóa đơn của chính mình
    if (req.user?.role === 'CUSTOMER') {
      customerId = req.user.customerId || -1;
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      params.push(status);
      conditions.push(`i.status = $${params.length}`);
    }

    if (customerId) {
      params.push(customerId);
      conditions.push(`i.customer_id = $${params.length}`);
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(i.invoice_code ILIKE $${params.length} OR c.full_name ILIKE $${params.length} OR p.name ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) 
      FROM invoices i 
      JOIN customers c ON i.customer_id = c.id 
      JOIN pets p ON i.pet_id = p.id 
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT i.*, 
             c.full_name as customer_name, c.phone as customer_phone,
             p.name as pet_name, p.species as pet_species
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN pets p ON i.pet_id = p.id
      ${whereClause}
      ORDER BY i.created_at DESC
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

export async function getInvoiceById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    const invoiceSql = `
      SELECT i.*, 
             c.full_name as customer_name, c.phone as customer_phone, c.address as customer_address, c.email as customer_email,
             p.name as pet_name, p.species as pet_species, p.breed as pet_breed,
             a.appointment_code
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN pets p ON i.pet_id = p.id
      LEFT JOIN appointments a ON i.appointment_id = a.id
      WHERE i.id = $1
    `;

    const invoiceRes = await query(invoiceSql, [id]);
    if (invoiceRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
      return;
    }

    const invoice = invoiceRes.rows[0];

    // Khách hàng chỉ xem được hóa đơn của chính mình
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== invoice.customer_id) {
      res.status(403).json({
        success: false,
        message: 'Quyền truy cập bị từ chối. Bạn không được phép xem hóa đơn của khách hàng khác.',
      });
      return;
    }

    // Fetch items
    const itemsRes = await query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC',
      [id]
    );

    invoice.items = itemsRes.rows;

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

export async function createInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const validated = createInvoiceSchema.parse(req.body);

    // Calculate total amount securely on backend:
    // If serviceId is provided, query true name and price from DB to prevent client price tampering
    let calculatedTotal = 0;
    const processedItems: Array<{
      serviceId: number | null;
      serviceName: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }> = [];

    for (const item of validated.items) {
      let name = item.serviceName || '';
      let price = item.unitPrice ?? 0;

      if (item.serviceId) {
        const svcRes = await client.query('SELECT name, price FROM services WHERE id = $1', [item.serviceId]);
        if (svcRes.rows.length > 0) {
          name = svcRes.rows[0].name;
          price = parseFloat(svcRes.rows[0].price);
        }
      }

      if (!name) {
        name = 'Dịch vụ chăm sóc';
      }

      const lineAmount = item.quantity * price;
      calculatedTotal += lineAmount;
      processedItems.push({
        serviceId: item.serviceId || null,
        serviceName: name,
        quantity: item.quantity,
        unitPrice: price,
        amount: lineAmount,
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const invoiceCode = `INV${dateStr}-${randNum}`;

    const status = validated.status || 'CHUA_THANH_TOAN';
    const paidAt = status === 'DA_THANH_TOAN' ? new Date().toISOString() : null;

    await client.query('BEGIN');

    const invResult = await client.query(
      `INSERT INTO invoices (invoice_code, appointment_id, customer_id, pet_id, total_amount, status, payment_method, paid_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        invoiceCode,
        validated.appointmentId || null,
        validated.customerId,
        validated.petId,
        calculatedTotal,
        status,
        validated.paymentMethod || 'TIEN_MAT',
        paidAt,
        validated.notes || null,
      ]
    );

    const invoice = invResult.rows[0];

    // Insert invoice items
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, service_id, service_name, quantity, unit_price, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoice.id, item.serviceId || null, item.serviceName, item.quantity, item.unitPrice, item.amount]
      );
    }

    // If linked to an appointment and invoice is marked paid, optionally mark appointment as HOAN_THANH
    if (validated.appointmentId && status === 'DA_THANH_TOAN') {
      await client.query(
        `UPDATE appointments SET status = 'HOAN_THANH', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [validated.appointmentId]
      );
    }

    await client.query('COMMIT');

    await createAuditLog(
      req.user?.id,
      'CREATE',
      'INVOICE',
      invoice.id,
      { invoiceCode, totalAmount: calculatedTotal, status },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Tạo hóa đơn thành công',
      data: {
        ...invoice,
        items: processedItems,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function payInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const id = parseInt(req.params.id, 10);
    const { paymentMethod } = req.body;

    const validMethods = ['TIEN_MAT', 'CHUYEN_KHOAN', 'MA_QR', 'QR_DEMO'];
    const chosenMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'TIEN_MAT';

    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE invoices
       SET status = 'DA_THANH_TOAN', payment_method = $1, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [chosenMethod, id]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
      return;
    }

    const updatedInvoice = updateRes.rows[0];

    // If linked to appointment, update appointment status to HOAN_THANH
    if (updatedInvoice.appointment_id) {
      await client.query(
        `UPDATE appointments SET status = 'HOAN_THANH', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [updatedInvoice.appointment_id]
      );
    }

    await client.query('COMMIT');

    await createAuditLog(
      req.user?.id,
      'PAY',
      'INVOICE',
      id,
      { paymentMethod: chosenMethod, totalAmount: updatedInvoice.total_amount },
      req.ip
    );

    res.json({
      success: true,
      message: 'Thanh toán hóa đơn thành công',
      data: updatedInvoice,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}
