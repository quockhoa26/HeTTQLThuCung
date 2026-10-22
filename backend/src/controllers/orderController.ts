import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { createAuditLog } from '../utils/audit.js';

const createOrderSchema = z.object({
  petId: z.number().int().positive('Vui lòng chọn thú cưng hợp lệ'),
  paymentMethod: z.enum(['TIEN_MAT', 'CHUYEN_KHOAN', 'QR_DEMO', 'MA_QR']).optional(),
  customerName: z.string().optional().or(z.literal('')),
  customerPhone: z.string().optional().or(z.literal('')),
  shippingAddress: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  customerId: z.number().int().positive().optional(),
});

const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DANG_GIAO', 'HOAN_THANH', 'DA_HUY'], {
    errorMap: () => ({ message: 'Trạng thái đơn hàng không hợp lệ' }),
  }),
  notes: z.string().optional().or(z.literal('')),
});

/**
 * 1. Đặt mua thú cưng trực tuyến (Dành cho CUSTOMER hoặc Nhân viên tạo hộ)
 * Giá bán được kiểm tra và tính toán 100% tại backend từ bảng pets
 * Sử dụng transaction & row lock (FOR UPDATE) chống race-condition hai người cùng mua
 */
export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const validated = createOrderSchema.parse(req.body);

    // Xác định customerId:
    // Nếu là CUSTOMER -> lấy từ token của khách
    // Nếu là STAFF/ADMIN -> có thể nhận customerId từ body
    let targetCustomerId: number;
    if (req.user?.role === 'CUSTOMER') {
      if (!req.user.customerId) {
        res.status(400).json({ success: false, message: 'Tài khoản khách hàng chưa được liên kết hồ sơ' });
        return;
      }
      targetCustomerId = req.user.customerId;
    } else {
      if (!validated.customerId) {
        res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã khách hàng (customerId)' });
        return;
      }
      targetCustomerId = validated.customerId;
    }

    await client.query('BEGIN');

    // 1. Kiểm tra thông tin khách hàng
    const custRes = await client.query('SELECT id, full_name, phone, address FROM customers WHERE id = $1', [targetCustomerId]);
    if (custRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ khách hàng' });
      return;
    }
    const customer = custRes.rows[0];

    // 2. Khóa dòng thú cưng để kiểm tra tính hợp lệ và tránh tranh chấp (FOR UPDATE)
    const petRes = await client.query(
      'SELECT id, pet_code, name, species, breed, price, status, is_public, customer_id, image_url FROM pets WHERE id = $1 FOR UPDATE',
      [validated.petId]
    );

    if (petRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy thông tin thú cưng' });
      return;
    }

    const pet = petRes.rows[0];

    // Kiểm tra điều kiện bán:
    // - Phải là thú cưng công khai của cửa hàng (is_public !== false)
    // - Phải có giá bán hợp lệ (> 0)
    // - Phải ở trạng thái SAN_SANG (chưa ai đặt và chưa có chủ)
    if (pet.is_public === false) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Thú cưng này không thuộc danh mục mở bán công khai của cửa hàng',
      });
      return;
    }

    const unitPrice = parseFloat(pet.price);
    if (!unitPrice || unitPrice <= 0) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Thú cưng này chưa được thiết lập giá bán thương mại công khai',
      });
      return;
    }

    if (pet.status !== 'SAN_SANG') {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Thú cưng này hiện không còn khả dụng hoặc đã có người đặt mua trước đó',
      });
      return;
    }

    // 3. Chuẩn bị dữ liệu đơn hàng
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `ORD${dateStr}-${randNum}`;

    const customerName = validated.customerName?.trim() || customer.full_name;
    const customerPhone = validated.customerPhone?.trim() || customer.phone;
    const shippingAddress = validated.shippingAddress?.trim() || customer.address || 'Nhận tại cửa hàng PetCare';
    const paymentMethod = validated.paymentMethod || 'TIEN_MAT';

    // 4. Tạo đơn mua hàng vào bảng pet_orders
    const insertOrderSql = `
      INSERT INTO pet_orders (
        order_code, customer_id, pet_id, pet_name, pet_species,
        unit_price, total_amount, payment_method, payment_status,
        order_status, customer_name, customer_phone, shipping_address, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CHUA_THANH_TOAN', 'CHO_XAC_NHAN', $9, $10, $11, $12)
      RETURNING *
    `;

    const orderRes = await client.query(insertOrderSql, [
      orderCode,
      targetCustomerId,
      pet.id,
      pet.name,
      pet.species,
      unitPrice,
      unitPrice, // tổng tiền = đơn giá thú cưng (tính từ backend)
      paymentMethod,
      customerName,
      customerPhone,
      shippingAddress,
      validated.notes?.trim() || null,
    ]);

    const order = orderRes.rows[0];

    // 5. Cập nhật trạng thái thú cưng thành DA_DAT (tạm giữ chỗ cho đơn hàng này)
    await client.query(
      "UPDATE pets SET status = 'DA_DAT', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [pet.id]
    );

    // 6. Ghi nhật ký hệ thống (Audit log)
    await createAuditLog(
      req.user?.id || null,
      'CREATE',
      'PET_ORDER',
      order.id,
      { orderCode, petId: pet.id, petName: pet.name, totalAmount: unitPrice, paymentMethod },
      req.ip
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Đặt mua thú cưng thành công! Mã đơn hàng: ' + orderCode,
      data: {
        ...order,
        pet_image_url: pet.image_url,
        pet_breed: pet.breed,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * 2. Lấy danh sách đơn hàng
 * - CUSTOMER: Chỉ xem được đơn mua của chính mình
 * - STAFF / ADMIN: Xem được toàn bộ đơn hàng
 */
export async function getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = (page - 1) * limit;
    const status = (req.query.status as string) || '';
    const paymentStatus = (req.query.paymentStatus as string) || '';
    const search = (req.query.search as string) || '';

    let customerId = req.query.customerId ? parseInt(req.query.customerId as string, 10) : undefined;

    // Phân quyền bắt buộc: Khách hàng chỉ xem được đơn của mình
    if (req.user?.role === 'CUSTOMER') {
      customerId = req.user.customerId || -1;
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (customerId) {
      params.push(customerId);
      conditions.push(`o.customer_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`o.order_status = $${params.length}`);
    }

    if (paymentStatus) {
      params.push(paymentStatus);
      conditions.push(`o.payment_status = $${params.length}`);
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(o.order_code ILIKE $${params.length} OR o.pet_name ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR o.customer_phone ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM pet_orders o ${whereClause}`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const dataSql = `
      SELECT o.*,
             p.pet_code, p.image_url as pet_image_url, p.breed as pet_breed,
             c.email as customer_email
      FROM pet_orders o
      JOIN pets p ON o.pet_id = p.id
      JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const dataRes = await query(dataSql, dataParams);

    res.json({
      success: true,
      data: dataRes.rows,
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

/**
 * 3. Xem chi tiết đơn hàng
 * Phân quyền: CUSTOMER không được xem đơn của người khác
 */
export async function getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    const orderSql = `
      SELECT o.*,
             p.pet_code, p.image_url as pet_image_url, p.breed as pet_breed, p.health_status as pet_health,
             c.email as customer_email
      FROM pet_orders o
      JOIN pets p ON o.pet_id = p.id
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `;

    const orderRes = await query(orderSql, [id]);
    if (orderRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }

    const order = orderRes.rows[0];

    // Chặn CUSTOMER xem đơn của người khác
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== order.customer_id) {
      res.status(403).json({
        success: false,
        message: 'Quyền truy cập bị từ chối. Bạn không được phép xem đơn hàng của khách hàng khác.',
      });
      return;
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Cập nhật trạng thái đơn hàng (Dành riêng cho STAFF và ADMIN)
 * - CHO_XAC_NHAN -> DA_XAC_NHAN -> DANG_GIAO -> HOAN_THANH
 * - Nếu DA_HUY: giải phóng thú cưng trở lại trạng thái SAN_SANG
 * - Nếu HOAN_THANH: chuyển thú cưng thành DA_CO_CHU và gán customer_id cho người mua
 */
export async function updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const id = parseInt(req.params.id, 10);
    const validated = updateOrderStatusSchema.parse(req.body);

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM pet_orders WHERE id = $1 FOR UPDATE', [id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }

    const order = orderRes.rows[0];
    const prevStatus = order.order_status;
    const newStatus = validated.orderStatus;

    // Cập nhật trạng thái đơn hàng
    const updRes = await client.query(
      `UPDATE pet_orders
       SET order_status = $1,
           notes = COALESCE($2, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [newStatus, validated.notes?.trim() || null, id]
    );

    // Xử lý trạng thái thú cưng tương ứng:
    if (newStatus === 'DA_HUY' && prevStatus !== 'DA_HUY') {
      // Đơn bị hủy: giải phóng thú cưng để người khác có thể mua
      await client.query(
        "UPDATE pets SET status = 'SAN_SANG', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [order.pet_id]
      );
    } else if (newStatus === 'HOAN_THANH') {
      // Đơn hoàn thành: chuyển quyền sở hữu thú cưng cho khách mua
      await client.query(
        "UPDATE pets SET status = 'DA_CO_CHU', customer_id = $1, is_public = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [order.customer_id, order.pet_id]
      );
    }

    await createAuditLog(
      req.user?.id || null,
      'UPDATE_STATUS',
      'PET_ORDER',
      id,
      { orderCode: order.order_code, prevStatus, newStatus },
      req.ip
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái đơn hàng thành: ${newStatus}`,
      data: updRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * 5. Xác nhận thanh toán đơn mua thú cưng (Dành riêng cho STAFF và ADMIN)
 */
export async function payOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const id = parseInt(req.params.id, 10);
    const { paymentMethod } = req.body;

    const validMethods = ['TIEN_MAT', 'CHUYEN_KHOAN', 'QR_DEMO', 'MA_QR'];
    const chosenMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'TIEN_MAT';

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM pet_orders WHERE id = $1 FOR UPDATE', [id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }

    const order = orderRes.rows[0];

    const updRes = await client.query(
      `UPDATE pet_orders
       SET payment_status = 'DA_THANH_TOAN',
           payment_method = $1,
           paid_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [chosenMethod, id]
    );

    await createAuditLog(
      req.user?.id || null,
      'PAY',
      'PET_ORDER',
      id,
      { orderCode: order.order_code, paymentMethod: chosenMethod, totalAmount: order.total_amount },
      req.ip
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Xác nhận thanh toán đơn hàng thành công!',
      data: updRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}
