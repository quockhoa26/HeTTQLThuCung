import readline from 'readline';
import bcrypt from 'bcryptjs';
import { pool, query } from '../config/db.js';

interface CreateUserOptions {
  username: string;
  fullName: string;
  email: string;
  roleName: 'ADMIN' | 'STAFF';
  password: string;
}

/**
 * Tạo một tài khoản mới an toàn trong cơ sở dữ liệu
 */
export async function createAccount(options: CreateUserOptions) {
  const { username, fullName, email, roleName, password } = options;

  if (!password || password.length < 6) {
    throw new Error(`Mật khẩu cho tài khoản ${username} phải có ít nhất 6 ký tự.`);
  }

  // 1. Kiểm tra role_id
  const roleResult = await query('SELECT id, name FROM roles WHERE name = $1', [roleName]);
  if (roleResult.rows.length === 0) {
    throw new Error(`Vai trò ${roleName} không tồn tại trong bảng roles.`);
  }
  const roleId = roleResult.rows[0].id;

  // 2. Kiểm tra tài khoản hoặc email đã tồn tại chưa
  const existingUser = await query(
    'SELECT id, username, email FROM users WHERE username = $1 OR email = $2',
    [username, email]
  );

  if (existingUser.rows.length > 0) {
    const matched = existingUser.rows[0];
    const reason = matched.username === username ? `username "${username}"` : `email "${email}"`;
    console.warn(`[CẢNH BÁO] Tài khoản với ${reason} đã tồn tại trong hệ thống (ID: ${matched.id}).`);
    console.warn(`-> Hệ thống giữ nguyên tài khoản hiện có, KHÔNG ghi đè mật khẩu hoặc thay đổi quyền.`);
    return { created: false, user: matched };
  }

  // 3. Băm mật khẩu bằng bcryptjs với 10 vòng lặp muối (chuẩn bảo mật của hệ thống)
  const passwordHash = await bcrypt.hash(password, 10);

  // 4. Lưu tài khoản mới vào PostgreSQL
  const insertResult = await query(
    `INSERT INTO users (username, password_hash, full_name, email, role_id, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING id, username, full_name, email, role_id, is_active, created_at`,
    [username, passwordHash, fullName, email, roleId]
  );

  const newUser = insertResult.rows[0];
  console.log(`[THÀNH CÔNG] Đã tạo mới tài khoản [${newUser.username}] với vai trò [${roleName}] (ID: ${newUser.id}).`);
  return { created: true, user: newUser };
}

/**
 * Đọc mật khẩu ẩn từ terminal không hiển thị ký tự ra màn hình
 */
function promptHiddenPassword(promptText: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const stdin = process.stdin;
    process.stdout.write(promptText);

    // Bắt từng phím để hiển thị dấu hoa thị hoặc ẩn hoàn toàn
    let password = '';
    const onData = (char: Buffer) => {
      const str = char.toString('utf-8');
      switch (str) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007f': // Backspace
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += str;
          process.stdout.write('*');
          break;
      }
    };

    if (process.stdin.isTTY) {
      stdin.setRawMode?.(true);
      stdin.resume();
      stdin.on('data', onData);
    }

    rl.question('', () => {
      if (process.stdin.isTTY) {
        stdin.setRawMode?.(false);
      }
      rl.close();
      console.log('');
      resolve(password);
    });
  });
}

/**
 * Chạy tương tác khi gọi trực tiếp từ CLI
 */
async function main() {
  console.log('================================================================');
  console.log('KHỞI TẠO TÀI KHOẢN ADMIN VÀ NHÂN VIÊN - PETCARE MANAGEMENT');
  console.log('================================================================');
  console.log('Lưu ý: Mật khẩu bạn nhập sẽ được mã hóa an toàn bằng bcryptjs.');
  console.log('Mật khẩu KHÔNG được in ra log và KHÔNG lưu dưới dạng văn bản thô.\n');

  try {
    // 1. Nhập mật khẩu cho admin_khoa
    console.log('--- [1/2] Tài khoản ADMIN: admin_khoa ---');
    const adminPass = await promptHiddenPassword('Nhập mật khẩu cho admin_khoa: ');
    const adminPassConfirm = await promptHiddenPassword('Xác nhận lại mật khẩu cho admin_khoa: ');

    if (adminPass !== adminPassConfirm) {
      console.error('\n[LỖI] Mật khẩu xác nhận của admin_khoa không khớp! Hủy bỏ thao tác.');
      process.exit(1);
    }

    // 2. Nhập mật khẩu cho nhanvien01
    console.log('\n--- [2/2] Tài khoản STAFF: nhanvien01 ---');
    const staffPass = await promptHiddenPassword('Nhập mật khẩu cho nhanvien01: ');
    const staffPassConfirm = await promptHiddenPassword('Xác nhận lại mật khẩu cho nhanvien01: ');

    if (staffPass !== staffPassConfirm) {
      console.error('\n[LỖI] Mật khẩu xác nhận của nhanvien01 không khớp! Hủy bỏ thao tác.');
      process.exit(1);
    }

    console.log('\nĐang tiến hành tạo tài khoản trong cơ sở dữ liệu PostgreSQL...');

    await createAccount({
      username: 'admin_khoa',
      fullName: 'Quản trị viên Khoa',
      email: 'admin_khoa@petcare.vn',
      roleName: 'ADMIN',
      password: adminPass,
    });

    await createAccount({
      username: 'nhanvien01',
      fullName: 'Nhân viên Chăm sóc 01',
      email: 'nhanvien01@petcare.vn',
      roleName: 'STAFF',
      password: staffPass,
    });

    console.log('\n================================================================');
    console.log('HOÀN TẤT KHỞI TẠO TÀI KHOẢN THÀNH CÔNG');
    console.log('================================================================');
  } catch (error: any) {
    console.error('\n[LỖI THỰC THI]', error.message || error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].includes('createAccounts')) {
  main();
}
