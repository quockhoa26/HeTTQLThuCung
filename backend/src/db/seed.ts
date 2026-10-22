import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSeeds() {
  logger.info('Bắt đầu khởi tạo dữ liệu mẫu (Seed Data)...');
  const seedPath = path.join(__dirname, 'seed.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(seedSql);

    // Update real bcrypt hashes for reliable demo login
    const adminHash = await bcrypt.hash('Admin@123', 10);
    const staffHash = await bcrypt.hash('Staff@123', 10);
    const customerHash = await bcrypt.hash('khoa12345', 10);

    await client.query('UPDATE users SET password_hash = $1 WHERE username = $2', [adminHash, 'admin']);
    await client.query('UPDATE users SET password_hash = $1 WHERE username IN ($2, $3)', [staffHash, 'staff1', 'staff2']);
    await client.query('UPDATE users SET password_hash = $1 WHERE username = $2', [customerHash, 'khachhang01']);

    await client.query('COMMIT');
    logger.info('Khởi tạo dữ liệu mẫu (Seed Data) thành công!');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Lỗi khi seed dữ liệu:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Đảm bảo tài khoản CUSTOMER khachhang01 luôn tồn tại (idempotent)
 */
export async function ensureCustomerSeed() {
  const client = await pool.connect();
  try {
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'CUSTOMER'");
    let customerRoleId = roleRes.rows[0]?.id;
    if (!customerRoleId) {
      const insRole = await client.query("INSERT INTO roles (name, description) VALUES ('CUSTOMER', 'Khách hàng sử dụng dịch vụ') RETURNING id");
      customerRoleId = insRole.rows[0].id;
    }

    const checkCustUser = await client.query("SELECT id FROM users WHERE username = 'khachhang01'");
    if (checkCustUser.rows.length === 0) {
      logger.info('Đang khởi tạo tài khoản khách hàng thử nghiệm khachhang01...');
      let customerId: number;
      const custRes = await client.query("SELECT id FROM customers WHERE email = 'khachhang01@gmail.com' OR phone = '0988001122'");
      if (custRes.rows.length === 0) {
        const insCust = await client.query(`
          INSERT INTO customers (full_name, phone, email, address, notes)
          VALUES ('Khách Hàng Thử Nghiệm 01', '0988001122', 'khachhang01@gmail.com', '123 Nguyễn Thị Minh Khai, Quận 1, TP.HCM', 'Tài khoản khách hàng thử nghiệm hệ thống')
          RETURNING id
        `);
        customerId = insCust.rows[0].id;
      } else {
        customerId = custRes.rows[0].id;
      }

      const customerHash = await bcrypt.hash('khoa12345', 10);
      await client.query(`
        INSERT INTO users (username, password_hash, full_name, email, role_id, customer_id, is_active)
        VALUES ('khachhang01', $1, 'Khách Hàng Thử Nghiệm 01', 'khachhang01@gmail.com', $2, $3, TRUE)
        ON CONFLICT (username) DO NOTHING
      `, [customerHash, customerRoleId, customerId]);

      // Pet PET007 Lucky
      const petRes = await client.query("SELECT id FROM pets WHERE pet_code = 'PET007'");
      let petId: number;
      if (petRes.rows.length === 0) {
        const insPet = await client.query(`
          INSERT INTO pets (pet_code, name, species, breed, gender, birth_date, weight, fur_color, health_status, notes, customer_id, is_public, price, status, image_url)
          VALUES ('PET007', 'Lucky', 'Chó', 'Corgi Welsh', 'Đực', '2023-06-10', 11.2, 'Vàng trắng', 'Khỏe mạnh, tiêm chủng đầy đủ', 'Bé Corgi chân ngắn đáng yêu của khách hàng 01', $1, FALSE, 0, 'DA_CO_CHU', 'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=600&auto=format&fit=crop&q=80')
          RETURNING id
        `, [customerId]);
        petId = insPet.rows[0].id;
      } else {
        petId = petRes.rows[0].id;
      }

      // Appointment
      const aptRes = await client.query("SELECT id FROM appointments WHERE appointment_code = 'APT20261022-KH01'");
      let aptId: number;
      if (aptRes.rows.length === 0) {
        const insApt = await client.query(`
          INSERT INTO appointments (appointment_code, customer_id, pet_id, staff_id, appointment_date, end_time, status, notes)
          VALUES ('APT20261022-KH01', $1, $2, 2, '2026-10-23 10:00:00+07', '2026-10-23 11:30:00+07', 'DA_XAC_NHAN', 'Tắm spa và cắt tỉa lông bé Lucky')
          RETURNING id
        `, [customerId, petId]);
        aptId = insApt.rows[0].id;

        await client.query(`
          INSERT INTO appointment_services (appointment_id, service_id, price)
          VALUES ($1, 1, 150000), ($1, 2, 250000)
          ON CONFLICT DO NOTHING
        `, [aptId]);
      } else {
        aptId = aptRes.rows[0].id;
      }

      // Invoice
      const invRes = await client.query("SELECT id FROM invoices WHERE invoice_code = 'INV20261022-KH01'");
      if (invRes.rows.length === 0) {
        const insInv = await client.query(`
          INSERT INTO invoices (invoice_code, appointment_id, customer_id, pet_id, total_amount, status, payment_method, paid_at, notes)
          VALUES ('INV20261022-KH01', $1, $2, $3, 400000, 'CHUA_THANH_TOAN', 'CHUYEN_KHOAN', NULL, 'Hóa đơn tạm tính dịch vụ spa & cắt lông Lucky')
          RETURNING id
        `, [aptId, customerId, petId]);
        const invId = insInv.rows[0].id;

        await client.query(`
          INSERT INTO invoice_items (invoice_id, service_id, service_name, quantity, unit_price, amount)
          VALUES ($1, 1, 'Tắm spa & sấy tạo kiểu', 1, 150000, 150000),
                 ($1, 2, 'Cắt tỉa lông nghệ thuật', 1, 250000, 250000)
        `, [invId]);
      }
      logger.info('Khởi tạo tài khoản khachhang01 và dữ liệu mẫu thành công!');
    }

    // Đảm bảo dữ liệu mẫu loài Chim và Cá luôn sẵn sàng
    await ensureSpeciesSeed(client);
  } catch (error) {
    logger.error('Lỗi khi kiểm tra customer seed:', error);
  } finally {
    client.release();
  }
}

/**
 * Đảm bảo dữ liệu mẫu loài Chim và Cá luôn tồn tại (idempotent)
 */
export async function ensureSpeciesSeed(client: any) {
  const newPets = [
    {
      code: 'PET008',
      name: 'Kiki',
      species: 'Chim',
      breed: 'Vẹt Macaw',
      gender: 'Đực',
      birthDate: '2023-04-12',
      weight: 1.15,
      furColor: 'Xanh lam vàng đỏ',
      healthStatus: 'Khỏe mạnh, hoạt bát',
      notes: 'Vẹt Macaw thông minh, thân thiện, đã được thuần dưỡng và huấn luyện đứng trên vai',
      price: 12000000,
      status: 'SAN_SANG',
      imageUrl: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600&auto=format&fit=crop&q=80',
    },
    {
      code: 'PET009',
      name: 'Rio',
      species: 'Chim',
      breed: 'Yến Phụng (Budgerigar)',
      gender: 'Cái',
      birthDate: '2023-09-05',
      weight: 0.05,
      furColor: 'Xanh ngọc pha vàng',
      healthStatus: 'Tốt, hót líu lo vui tai',
      notes: 'Chim Yến Phụng non lanh lợi, ăn hạt kê, thích tương tác với con người, rất dễ nuôi',
      price: 350000,
      status: 'SAN_SANG',
      imageUrl: 'https://images.unsplash.com/photo-1522858547137-f1dcec554f55?w=600&auto=format&fit=crop&q=80',
    },
    {
      code: 'PET010',
      name: 'Goldie',
      species: 'Cá',
      breed: 'Cá Vàng Ranchu',
      gender: 'Đực',
      birthDate: '2023-10-01',
      weight: 0.15,
      furColor: 'Đỏ cam ánh bạc',
      healthStatus: 'Khỏe mạnh, bơi lội linh hoạt',
      notes: 'Cá vàng Ranchu nhập khẩu, dáng đầu lân tròn béo đáng yêu, thích hợp hồ kính trong nhà',
      price: 450000,
      status: 'SAN_SANG',
      imageUrl: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=600&auto=format&fit=crop&q=80',
    },
    {
      code: 'PET011',
      name: 'Neptune',
      species: 'Cá',
      breed: 'Cá Betta Halfmoon',
      gender: 'Đực',
      birthDate: '2024-01-10',
      weight: 0.04,
      furColor: 'Xanh dương Sapphire ánh kim',
      healthStatus: 'Sung mãn, vây đuôi hoàn hảo',
      notes: 'Cá xiêm Betta đuôi xòe 180 độ màu xanh ánh kim tuyệt đẹp, thích hợp trang trí bàn làm việc',
      price: 250000,
      status: 'SAN_SANG',
      imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80',
    },
  ];

  for (const p of newPets) {
    const exist = await client.query('SELECT id FROM pets WHERE pet_code = $1', [p.code]);
    if (exist.rows.length === 0) {
      await client.query(
        `INSERT INTO pets (pet_code, name, species, breed, gender, birth_date, weight, fur_color, health_status, notes, is_public, price, status, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $12, $13)`,
        [p.code, p.name, p.species, p.breed, p.gender, p.birthDate, p.weight, p.furColor, p.healthStatus, p.notes, p.price, p.status, p.imageUrl]
      );
      logger.info(`Đã khởi tạo thú cưng mới: ${p.code} (${p.name} - ${p.species} ${p.breed})`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeeds()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
