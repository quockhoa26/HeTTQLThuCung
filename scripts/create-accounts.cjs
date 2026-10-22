/**
 * PetCare Management System - Script Khởi Tạo & Kiểm Tra Tài Khoản An Toàn
 * Chạy trực tiếp bên trong container pet-backend hoặc môi trường Node.js kết nối PostgreSQL
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'petadmin',
  password: process.env.DB_PASSWORD || 'PetAdminStrong2026!Secured',
  database: process.env.DB_NAME || 'petmanagement',
});

async function runVerification() {
  const client = await pool.connect();
  try {
    const usersRes = await client.query(`
      SELECT u.id, u.username, u.full_name, u.email, r.name as role, u.is_active, u.password_hash
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.username IN ('admin_khoa', 'nhanvien01', 'admin', 'staff1', 'staff2')
      ORDER BY u.id ASC
    `);

    const usersMap = {};
    usersRes.rows.forEach(u => {
      usersMap[u.username] = u;
    });

    const adminKhoa = usersMap['admin_khoa'];
    const nhanvien01 = usersMap['nhanvien01'];
    const demoAdmin = usersMap['admin'];
    const demoStaff1 = usersMap['staff1'];
    const demoStaff2 = usersMap['staff2'];

    const report = {
      adminKhoaExists: !!adminKhoa,
      adminKhoaRole: adminKhoa ? adminKhoa.role : null,
      adminKhoaHashValid: adminKhoa ? (adminKhoa.password_hash.startsWith('$2a$') || adminKhoa.password_hash.startsWith('$2b$')) : false,
      nhanvien01Exists: !!nhanvien01,
      nhanvien01Role: nhanvien01 ? nhanvien01.role : null,
      nhanvien01HashValid: nhanvien01 ? (nhanvien01.password_hash.startsWith('$2a$') || nhanvien01.password_hash.startsWith('$2b$')) : false,
      demosPreserved: !!(demoAdmin && demoStaff1 && demoStaff2),
      demoUsers: [demoAdmin, demoStaff1, demoStaff2].filter(Boolean).map(u => u.username),
    };

    return report;
  } finally {
    client.release();
  }
}

async function runCreation(payload) {
  const { adminPassword, staffPassword } = payload;

  if (!adminPassword || adminPassword.length < 6) {
    throw new Error('Mat khau admin_khoa phai tu 6 ky tu tro len.');
  }
  if (!staffPassword || staffPassword.length < 6) {
    throw new Error('Mat khau nhanvien01 phai tu 6 ky tu tro len.');
  }

  const client = await pool.connect();
  const results = {
    admin: null,
    staff: null,
  };

  try {
    await client.query('BEGIN');

    // 1. Lay role_id
    const rolesRes = await client.query('SELECT id, name FROM roles ORDER BY id ASC');
    const roleMap = {};
    rolesRes.rows.forEach(r => { roleMap[r.name] = r.id; });

    if (!roleMap['ADMIN'] || !roleMap['STAFF']) {
      throw new Error('Khong tim thay vai tro ADMIN hoac STAFF trong bang roles.');
    }

    // 2. Xu ly admin_khoa
    const adminCheck = await client.query(
      'SELECT id, username, email, role_id, is_active FROM users WHERE username = $1 OR email = $2',
      ['admin_khoa', 'admin_khoa@petcare.vn']
    );

    if (adminCheck.rows.length > 0) {
      results.admin = {
        action: 'SKIPPED_EXISTING',
        message: 'Tai khoan admin_khoa hoac email admin_khoa@petcare.vn da ton tai. Giu nguyen khong ghi de.',
        user: adminCheck.rows[0],
      };
    } else {
      const adminHash = await bcrypt.hash(adminPassword, 10);
      const insertAdmin = await client.query(
        `INSERT INTO users (username, password_hash, full_name, email, role_id, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id, username, full_name, email, role_id, is_active, created_at`,
        ['admin_khoa', adminHash, 'Quản trị viên Khoa', 'admin_khoa@petcare.vn', roleMap['ADMIN']]
      );
      results.admin = {
        action: 'CREATED',
        message: 'Tao moi thanh cong tai khoan admin_khoa (ADMIN)',
        user: insertAdmin.rows[0],
      };
    }

    // 3. Xu ly nhanvien01
    const staffCheck = await client.query(
      'SELECT id, username, email, role_id, is_active FROM users WHERE username = $1 OR email = $2',
      ['nhanvien01', 'nhanvien01@petcare.vn']
    );

    if (staffCheck.rows.length > 0) {
      results.staff = {
        action: 'SKIPPED_EXISTING',
        message: 'Tai khoan nhanvien01 hoac email nhanvien01@petcare.vn da ton tai. Giu nguyen khong ghi de.',
        user: staffCheck.rows[0],
      };
    } else {
      const staffHash = await bcrypt.hash(staffPassword, 10);
      const insertStaff = await client.query(
        `INSERT INTO users (username, password_hash, full_name, email, role_id, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id, username, full_name, email, role_id, is_active, created_at`,
        ['nhanvien01', staffHash, 'Nhân viên 01', 'nhanvien01@petcare.vn', roleMap['STAFF']]
      );
      results.staff = {
        action: 'CREATED',
        message: 'Tao moi thanh cong tai khoan nhanvien01 (STAFF)',
        user: insertStaff.rows[0],
      };
    }

    await client.query('COMMIT');
    return results;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const isVerifyOnly = process.argv.includes('--verify');

  if (isVerifyOnly) {
    try {
      const report = await runVerification();
      console.log(JSON.stringify({ success: true, mode: 'VERIFY', report }));
    } catch (err) {
      console.error(JSON.stringify({ success: false, error: err.message || err }));
      process.exit(1);
    } finally {
      await pool.end();
    }
    return;
  }

  // Doc stdin
  let inputData = '';
  process.stdin.setEncoding('utf8');

  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  if (!inputData.trim()) {
    console.error(JSON.stringify({ success: false, message: 'Khong nhan duoc du lieu mat khau qua stdin.' }));
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(inputData.trim());
  } catch (err) {
    console.error(JSON.stringify({ success: false, message: 'Du lieu stdin khong hop le (JSON).' }));
    process.exit(1);
  }

  try {
    const results = await runCreation(payload);
    const verification = await runVerification();
    console.log(JSON.stringify({ success: true, mode: 'CREATE', results, verification }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: err.message || err }));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
