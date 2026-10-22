import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  logger.info('Bắt đầu chạy migration cơ sở dữ liệu...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schemaSql);
    // Idempotent column and role additions for existing databases
    await client.query(`
      INSERT INTO roles (id, name, description) VALUES (3, 'CUSTOMER', 'Khách hàng sử dụng dịch vụ') ON CONFLICT (name) DO NOTHING;
      SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
      ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users(customer_id);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'SAN_SANG';
      ALTER TABLE pets ALTER COLUMN customer_id DROP NOT NULL;

      -- 11. Bảng đơn đặt mua thú cưng trực tuyến cho khách hàng
      CREATE TABLE IF NOT EXISTS pet_orders (
          id SERIAL PRIMARY KEY,
          order_code VARCHAR(30) UNIQUE NOT NULL,
          customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
          pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
          pet_name VARCHAR(100) NOT NULL,
          pet_species VARCHAR(50) NOT NULL,
          unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
          total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
          payment_method VARCHAR(30) NOT NULL DEFAULT 'TIEN_MAT',
          payment_status VARCHAR(30) NOT NULL DEFAULT 'CHUA_THANH_TOAN',
          order_status VARCHAR(30) NOT NULL DEFAULT 'CHO_XAC_NHAN',
          customer_name VARCHAR(100),
          customer_phone VARCHAR(20),
          shipping_address TEXT,
          notes TEXT,
          paid_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_pet_orders_customer ON pet_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_pet_orders_pet ON pet_orders(pet_id);
      CREATE INDEX IF NOT EXISTS idx_pet_orders_status ON pet_orders(order_status);
    `);
    await client.query('COMMIT');
    logger.info('Migration cơ sở dữ liệu hoàn thành thành công!');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Lỗi khi thực hiện migration cơ sở dữ liệu:', error);
    throw error;
  } finally {
    client.release();
  }
}

// If run directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
