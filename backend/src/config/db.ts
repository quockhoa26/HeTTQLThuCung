import pg from 'pg';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export const pool = new Pool(config.database);

pool.on('connect', () => {
  logger.info('Kết nối cơ sở dữ liệu PostgreSQL thành công');
});

pool.on('error', (err) => {
  logger.error('Lỗi bất ngờ trong PostgreSQL Pool:', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Thực thi câu truy vấn', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Lỗi khi thực thi câu truy vấn:', { text, error });
    throw error;
  }
}

export async function getClient() {
  return await pool.connect();
}
