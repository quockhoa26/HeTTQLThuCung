import React, { useEffect, useState } from 'react';
import {
  Dog,
  Users,
  Calendar,
  Clock,
  DollarSign,
  CalendarCheck,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '../components/StatCard.js';
import { api } from '../services/api.js';
import { DashboardStats } from '../types/index.js';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu thống kê tổng quan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHO_XAC_NHAN':
        return <span className="badge badge-warning">Chờ xác nhận</span>;
      case 'DA_XAC_NHAN':
        return <span className="badge badge-info">Đã xác nhận</span>;
      case 'DANG_THUC_HIEN':
        return <span className="badge badge-info">Đang thực hiện</span>;
      case 'HOAN_THANH':
        return <span className="badge badge-success">Hoàn thành</span>;
      case 'DA_HUY':
        return <span className="badge badge-danger">Đã hủy</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <p>Đang tải dữ liệu thực tế từ cơ sở dữ liệu PostgreSQL...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Số liệu Vận hành Thực tế</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Dữ liệu trực tiếp truy vấn từ cơ sở dữ liệu PostgreSQL và liên kết giám sát Prometheus
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '10px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Top 5 Stat Cards */}
      <div className="stats-grid">
        <StatCard
          label="Tổng Thú Cưng"
          value={stats?.totalPets || 0}
          icon={Dog}
          variant="indigo"
          subtext="Đang được quản lý"
        />
        <StatCard
          label="Khách Hàng"
          value={stats?.totalCustomers || 0}
          icon={Users}
          variant="cyan"
          subtext="Hồ sơ liên hệ"
        />
        <StatCard
          label="Lịch Hẹn Hôm Nay"
          value={stats?.appointmentsToday || 0}
          icon={Calendar}
          variant="amber"
          subtext="Cần xử lý trong ngày"
        />
        <StatCard
          label="Chờ Xác Nhận"
          value={stats?.appointmentsPending || 0}
          icon={Clock}
          variant="rose"
          subtext="Lịch hẹn mới gửi đến"
        />
        <StatCard
          label="Tổng Doanh Thu"
          value={formatVND(stats?.totalRevenue || 0)}
          icon={DollarSign}
          variant="emerald"
          subtext="Từ hóa đơn hoàn tất"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Revenue Trend Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Doanh Thu 7 Ngày Gần Nhất</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '180px', paddingTop: '20px' }}>
            {stats?.revenueByPeriod && stats.revenueByPeriod.length > 0 ? (
              stats.revenueByPeriod.map((item, idx) => {
                const maxRevenue = Math.max(...stats.revenueByPeriod.map((i) => i.revenue), 500000);
                const heightPercent = Math.max(12, Math.round((item.revenue / maxRevenue) * 100));
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                      {item.revenue > 0 ? (item.revenue / 1000).toFixed(0) + 'k' : '0'}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '36px',
                        height: `${heightPercent}%`,
                        backgroundColor: item.revenue > 0 ? 'var(--primary)' : 'var(--border-color)',
                        borderRadius: '6px 6px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    ></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                      {item.date_label}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>Chưa có phát sinh doanh thu</div>
            )}
          </div>
        </div>

        {/* Species Distribution & Appointment Status Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Cơ Cấu Thú Cưng & Trạng Thái Lịch</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Phân bổ theo loài thú cưng:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {stats?.speciesDistribution && stats.speciesDistribution.length > 0 ? (
                  stats.speciesDistribution.map((sp, idx) => (
                    <span key={idx} className="badge badge-info" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                      🐾 {sp.species}: <strong>{sp.count}</strong>
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chưa có thú cưng</span>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Trạng thái các lịch hẹn:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {stats?.appointmentsByStatus && stats.appointmentsByStatus.length > 0 ? (
                  stats.appointmentsByStatus.map((st, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getStatusBadge(st.status)}
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>x{st.count}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chưa có lịch hẹn</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarCheck size={20} color="var(--primary)" />
            Lịch Hẹn Sắp Tới Gần Nhất
          </h3>
        </div>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã lịch</th>
                <th>Thời gian</th>
                <th>Khách hàng</th>
                <th>Thú cưng</th>
                <th>Nhân viên</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {stats?.upcomingAppointments && stats.upcomingAppointments.length > 0 ? (
                stats.upcomingAppointments.map((apt) => (
                  <tr key={apt.id}>
                    <td><strong>{apt.appointment_code}</strong></td>
                    <td>{formatDateTime(apt.appointment_date)}</td>
                    <td>
                      <div>{apt.customer_name}</div>
                      <small style={{ color: 'var(--text-muted)' }}>{apt.customer_phone}</small>
                    </td>
                    <td>
                      <div>🐾 {apt.pet_name}</div>
                      <small style={{ color: 'var(--text-muted)' }}>{apt.pet_species} ({apt.pet_breed || 'N/A'})</small>
                    </td>
                    <td>{apt.staff_name || 'Chưa phân công'}</td>
                    <td>{getStatusBadge(apt.status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    Hiện không có lịch hẹn sắp tới nào cần xử lý
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
