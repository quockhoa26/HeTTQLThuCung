import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { createAuditLog } from '../utils/audit.js';

const petSchema = z.object({
  petCode: z.string().optional(),
  name: z.string().min(1, 'Tên thú cưng không được để trống').max(100),
  species: z.string().min(1, 'Loài thú cưng không được để trống (vd: Chó, Mèo,...)'),
  breed: z.string().optional().or(z.literal('')),
  gender: z.enum(['Đực', 'Cái'], { errorMap: () => ({ message: 'Giới tính phải là "Đực" hoặc "Cái"' }) }),
  birthDate: z.string().optional().or(z.literal('')),
  weight: z.number().positive('Cân nặng phải là số dương lớn hơn 0').optional().nullable(),
  furColor: z.string().optional().or(z.literal('')),
  healthStatus: z.string().optional().or(z.literal('')),
  imageUrl: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
  price: z.number().min(0, 'Giá phải lớn hơn hoặc bằng 0').optional(),
  status: z.enum(['SAN_SANG', 'DA_DAT', 'DA_CO_CHU']).optional(),
  customerId: z.number().int().positive('Vui lòng chọn chủ sở hữu hợp lệ cho thú cưng').optional().nullable(),
});

/**
 * 1. API Công Khai: Lấy danh sách thú cưng hiển thị công khai (Không yêu cầu đăng nhập)
 * Không bao giờ trả về thông tin nhạy cảm của khách hàng hoặc nội bộ
 */
export async function getPublicPets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = (req.query.search as string) || '';
    const species = (req.query.species as string) || '';
    const breed = (req.query.breed as string) || '';
    const gender = (req.query.gender as string) || '';
    const status = (req.query.status as string) || '';
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 12;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['(p.is_public = TRUE OR p.is_public IS NULL)'];
    const params: any[] = [];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.pet_code ILIKE $${params.length} OR p.breed ILIKE $${params.length} OR p.species ILIKE $${params.length})`);
    }

    if (species.trim()) {
      params.push(species.trim());
      conditions.push(`p.species = $${params.length}`);
    }

    if (breed.trim()) {
      params.push(`%${breed.trim()}%`);
      conditions.push(`p.breed ILIKE $${params.length}`);
    }

    if (gender.trim() && (gender === 'Đực' || gender === 'Cái')) {
      params.push(gender.trim());
      conditions.push(`p.gender = $${params.length}`);
    }

    if (status.trim()) {
      params.push(status.trim());
      conditions.push(`p.status = $${params.length}`);
    }

    if (minPrice !== undefined && !isNaN(minPrice)) {
      params.push(minPrice);
      conditions.push(`p.price >= $${params.length}`);
    }

    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      params.push(maxPrice);
      conditions.push(`p.price <= $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countQuery = `SELECT COUNT(*) FROM pets p ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT 
        p.id,
        p.pet_code,
        p.name,
        p.species,
        p.breed,
        p.gender,
        p.birth_date,
        p.weight,
        p.fur_color,
        p.health_status,
        p.image_url,
        p.notes,
        p.is_public,
        COALESCE(p.price, 0) as price,
        COALESCE(p.status, 'SAN_SANG') as status,
        p.created_at
      FROM pets p
      ${whereClause}
      ORDER BY p.created_at DESC
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

/**
 * 2. API Công Khai: Xem chi tiết thú cưng công khai (Không yêu cầu đăng nhập)
 */
export async function getPublicPetById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'ID thú cưng không hợp lệ' });
      return;
    }

    const result = await query(
      `SELECT 
        p.id,
        p.pet_code,
        p.name,
        p.species,
        p.breed,
        p.gender,
        p.birth_date,
        p.weight,
        p.fur_color,
        p.health_status,
        p.image_url,
        p.notes,
        p.is_public,
        COALESCE(p.price, 0) as price,
        COALESCE(p.status, 'SAN_SANG') as status,
        p.created_at
       FROM pets p
       WHERE p.id = $1 AND (p.is_public = TRUE OR p.is_public IS NULL)`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thú cưng hoặc thông tin không được công khai' });
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
 * 3. API Dành cho CUSTOMER: Lấy danh sách thú cưng của chính mình
 */
export async function getMyPets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      return;
    }

    if (!req.user.customerId) {
      res.json({ success: true, data: [] });
      return;
    }

    const result = await query(
      `SELECT p.*,
              COALESCE(p.price, 0) as price,
              COALESCE(p.status, 'DA_CO_CHU') as status
       FROM pets p
       WHERE p.customer_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.customerId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. API Nội Bộ (ADMIN / STAFF): Lấy danh sách thú cưng kèm thông tin khách hàng và quản lý
 */
export async function getPets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = (req.query.search as string) || '';
    const species = (req.query.species as string) || '';
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string, 10) : undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.pet_code ILIKE $${params.length} OR p.breed ILIKE $${params.length} OR c.full_name ILIKE $${params.length})`);
    }

    if (species.trim()) {
      params.push(species.trim());
      conditions.push(`p.species = $${params.length}`);
    }

    if (customerId) {
      params.push(customerId);
      conditions.push(`p.customer_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) 
      FROM pets p 
      LEFT JOIN customers c ON p.customer_id = c.id 
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT p.*, 
             COALESCE(p.price, 0) as price,
             COALESCE(p.status, 'SAN_SANG') as status,
             c.full_name as customer_name, 
             c.phone as customer_phone
      FROM pets p
      LEFT JOIN customers c ON p.customer_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
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

/**
 * 5. API Nội Bộ (ADMIN / STAFF): Xem chi tiết thú cưng nội bộ (kèm lịch sử khám, spa)
 */
export async function getPetById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await query(
      `SELECT p.*, 
              COALESCE(p.price, 0) as price,
              COALESCE(p.status, 'SAN_SANG') as status,
              c.full_name as customer_name, 
              c.phone as customer_phone, 
              c.address as customer_address
       FROM pets p
       LEFT JOIN customers c ON p.customer_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thông tin thú cưng' });
      return;
    }

    const pet = result.rows[0];

    // Lấy lịch sử hẹn khám/spa
    const historyResult = await query(
      `SELECT a.*, u.full_name as staff_name
       FROM appointments a
       LEFT JOIN users u ON a.staff_id = u.id
       WHERE a.pet_id = $1
       ORDER BY a.appointment_date DESC`,
      [id]
    );

    pet.appointments = historyResult.rows;

    res.json({
      success: true,
      data: pet,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. Thêm thú cưng mới (ADMIN / STAFF)
 */
export async function createPet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = petSchema.parse(req.body);

    // Verify customer exists if customerId is provided
    if (validated.customerId) {
      const customer = await query('SELECT id FROM customers WHERE id = $1', [validated.customerId]);
      if (customer.rows.length === 0) {
        res.status(400).json({ success: false, message: 'Khách hàng (chủ sở hữu) không tồn tại' });
        return;
      }
    }

    // Auto-generate pet_code if not supplied
    let petCode = validated.petCode?.trim();
    if (!petCode) {
      const codeSeq = await query("SELECT nextval('pets_id_seq') as next_id");
      const nextId = codeSeq.rows[0].next_id;
      petCode = `PET${String(nextId).padStart(4, '0')}`;
    } else {
      const existing = await query('SELECT id FROM pets WHERE pet_code = $1', [petCode]);
      if (existing.rows.length > 0) {
        res.status(400).json({ success: false, message: 'Mã thú cưng này đã tồn tại trong hệ thống' });
        return;
      }
    }

    const result = await query(
      `INSERT INTO pets (pet_code, name, species, breed, gender, birth_date, weight, fur_color, health_status, image_url, notes, is_public, price, status, customer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        petCode,
        validated.name,
        validated.species,
        validated.breed || null,
        validated.gender,
        validated.birthDate || null,
        validated.weight || null,
        validated.furColor || null,
        validated.healthStatus || 'Bình thường',
        validated.imageUrl || null,
        validated.notes || null,
        validated.isPublic !== undefined ? validated.isPublic : true,
        validated.price || 0,
        validated.status || 'SAN_SANG',
        validated.customerId || null,
      ]
    );

    const created = result.rows[0];
    await createAuditLog(req.user?.id, 'CREATE', 'PET', created.id, { petCode, name: created.name }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Thêm thú cưng mới thành công',
      data: created,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 7. Cập nhật thú cưng (ADMIN / STAFF)
 */
export async function updatePet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const validated = petSchema.parse(req.body);

    if (validated.petCode) {
      const existing = await query('SELECT id FROM pets WHERE pet_code = $1 AND id != $2', [validated.petCode, id]);
      if (existing.rows.length > 0) {
        res.status(400).json({ success: false, message: 'Mã thú cưng này đã được sử dụng' });
        return;
      }
    }

    if (validated.customerId) {
      const customer = await query('SELECT id FROM customers WHERE id = $1', [validated.customerId]);
      if (customer.rows.length === 0) {
        res.status(400).json({ success: false, message: 'Khách hàng (chủ sở hữu) không tồn tại' });
        return;
      }
    }

    const result = await query(
      `UPDATE pets
       SET name = $1, species = $2, breed = $3, gender = $4, birth_date = $5,
           weight = $6, fur_color = $7, health_status = $8, image_url = $9,
           notes = $10, is_public = $11, price = $12, status = $13,
           customer_id = $14, updated_at = CURRENT_TIMESTAMP
       WHERE id = $15
       RETURNING *`,
      [
        validated.name,
        validated.species,
        validated.breed || null,
        validated.gender,
        validated.birthDate || null,
        validated.weight || null,
        validated.furColor || null,
        validated.healthStatus || 'Bình thường',
        validated.imageUrl || null,
        validated.notes || null,
        validated.isPublic !== undefined ? validated.isPublic : true,
        validated.price || 0,
        validated.status || 'SAN_SANG',
        validated.customerId || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thú cưng cần sửa' });
      return;
    }

    await createAuditLog(req.user?.id, 'UPDATE', 'PET', id, { name: validated.name }, req.ip);

    res.json({
      success: true,
      message: 'Cập nhật thú cưng thành công',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 8. Xóa thú cưng (ADMIN)
 */
export async function deletePet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    const activeApts = await query(
      `SELECT id FROM appointments WHERE pet_id = $1 AND status IN ('CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DANG_THUC_HIEN')`,
      [id]
    );

    if (activeApts.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Không thể xóa thú cưng đang có lịch hẹn chờ thực hiện.',
      });
      return;
    }

    const result = await query('DELETE FROM pets WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thú cưng' });
      return;
    }

    await createAuditLog(req.user?.id, 'DELETE', 'PET', id, { name: result.rows[0].name }, req.ip);

    res.json({
      success: true,
      message: 'Xóa thú cưng thành công',
    });
  } catch (error) {
    next(error);
  }
}
