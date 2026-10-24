import { Request, Response, NextFunction } from 'express';
import { query } from '../config/db.js';
import {
  totalPetsGauge,
  totalCustomersGauge,
  totalAppointmentsGauge,
  totalRevenueGauge,
} from '../utils/metrics.js';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Total Pets
    const petsRes = await query('SELECT COUNT(*) FROM pets');
    const totalPets = parseInt(petsRes.rows[0].count, 10);
    totalPetsGauge.set(totalPets);

    // 2. Total Customers
    const customersRes = await query('SELECT COUNT(*) FROM customers');
    const totalCustomers = parseInt(customersRes.rows[0].count, 10);
    totalCustomersGauge.set(totalCustomers);

    // 3. Appointments Today
    const todayAptRes = await query(
      `SELECT COUNT(*) FROM appointments 
       WHERE DATE(appointment_date AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE`
    );
    const appointmentsToday = parseInt(todayAptRes.rows[0].count, 10);

    // 4. Pending Appointments
    const pendingAptRes = await query(
      `SELECT COUNT(*) FROM appointments WHERE status = 'CHO_XAC_NHAN'`
    );
    const appointmentsPending = parseInt(pendingAptRes.rows[0].count, 10);

    // 5. Total Revenue (Paid Invoices)
    const revenueRes = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = 'DA_THANH_TOAN'`
    );
    const totalRevenue = parseFloat(revenueRes.rows[0].total);
    totalRevenueGauge.set(totalRevenue);

    // 6. Revenue by last 7 days
    const revenueByPeriodRes = await query(`
      SELECT 
        TO_CHAR(d.day, 'DD/MM') as date_label,
        COALESCE(SUM(i.total_amount), 0) as revenue
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) d(day)
      LEFT JOIN invoices i 
        ON DATE(i.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = DATE(d.day) 
        AND i.status = 'DA_THANH_TOAN'
      GROUP BY d.day
      ORDER BY d.day ASC
    `);

    // 7. Appointments count by status
    const aptStatusRes = await query(`
      SELECT status, COUNT(*) as count 
      FROM appointments 
      GROUP BY status
    `);
    const appointmentsByStatus = aptStatusRes.rows.map((row) => {
      totalAppointmentsGauge.set({ status: row.status }, parseInt(row.count, 10));
      return {
        status: row.status,
        count: parseInt(row.count, 10),
      };
    });

    // 8. Upcoming Appointments (Next 5)
    const upcomingRes = await query(`
      SELECT a.id, a.appointment_code, a.appointment_date, a.status,
             c.full_name as customer_name, c.phone as customer_phone,
             p.name as pet_name, p.species as pet_species,
             u.full_name as staff_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN pets p ON a.pet_id = p.id
      LEFT JOIN users u ON a.staff_id = u.id
      WHERE a.appointment_date >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      ORDER BY a.appointment_date ASC
      LIMIT 5
    `);

    // 9. Species distribution
    const speciesDistRes = await query(`
      SELECT species, COUNT(*) as count
      FROM pets
      GROUP BY species
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        totalPets,
        totalCustomers,
        appointmentsToday,
        appointmentsPending,
        totalRevenue,
        revenueByPeriod: revenueByPeriodRes.rows,
        appointmentsByStatus,
        upcomingAppointments: upcomingRes.rows,
        speciesDistribution: speciesDistRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cập nhật định kỳ các chỉ số nghiệp vụ từ cơ sở dữ liệu cho Prometheus metrics endpoint
 */
export async function updateBusinessMetrics(): Promise<void> {
  try {
    const petsRes = await query('SELECT COUNT(*) FROM pets');
    totalPetsGauge.set(parseInt(petsRes.rows[0].count, 10));

    const customersRes = await query('SELECT COUNT(*) FROM customers');
    totalCustomersGauge.set(parseInt(customersRes.rows[0].count, 10));

    const revenueRes = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = 'DA_THANH_TOAN'`
    );
    totalRevenueGauge.set(parseFloat(revenueRes.rows[0].total));

    const aptStatusRes = await query(`
      SELECT status, COUNT(*) as count 
      FROM appointments 
      GROUP BY status
    `);
    for (const row of aptStatusRes.rows) {
      totalAppointmentsGauge.set({ status: row.status }, parseInt(row.count, 10));
    }
  } catch {
    // Không làm gián đoạn metrics endpoint nếu cơ sở dữ liệu chưa sẵn sàng
  }
}

