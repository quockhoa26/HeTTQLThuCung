import { Request, Response, NextFunction } from 'express';
import { query } from '../config/db.js';

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = req.query.role as string;
    let sql = `
      SELECT u.id, u.username, u.full_name, u.email, u.is_active, r.name as role, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
    `;
    const params: any[] = [];

    if (role) {
      params.push(role);
      sql += ` WHERE r.name = $1`;
    }

    sql += ' ORDER BY u.id ASC';

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}
