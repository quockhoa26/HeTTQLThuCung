import React, { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, Clock, User } from 'lucide-react';
import { api } from '../services/api.js';
import { AuditLog } from '../types/index.js';

interface AuditPageProps {
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AuditPage: React.FC<AuditPageProps> = ({ onNotify }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs(page, 20);
      if (res.success) {
        setLogs(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
        }
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể tải nhật ký hoạt động hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="badge badge-success">Tạo mới</span>;
      case 'UPDATE':
      case 'UPDATE_STATUS':
        return <span className="badge badge-info">Cập nhật</span>;
      case 'DELETE':
        return <span className="badge badge-danger">Xóa bỏ</span>;
      case 'LOGIN':
        return <span className="badge badge-info">Đăng nhập</span>;
      case 'PAY':
        return <span className="badge badge-success">Thanh toán</span>;
      default:
        return <span className="badge badge-neutral">{action}</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Nhật Ký Hoạt Động & Kiểm Toán Hệ Thống (Audit Logs)</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Theo dõi tất cả các thao tác thay đổi dữ liệu, người thực hiện, thời gian và địa chỉ IP
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Người thực hiện</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Chi tiết thao tác</th>
              <th>Địa chỉ IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Đang tải nhật ký kiểm toán...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <ShieldAlert size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div>Chưa có nhật ký hoạt động nào</div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <Clock size={14} color="var(--text-muted)" />
                      <span>{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="var(--primary)" />
                      <strong>{log.user_full_name || log.username || 'Hệ thống'}</strong>
                    </div>
                  </td>
                  <td>{getActionBadge(log.action)}</td>
                  <td>
                    <span className="badge badge-neutral">{log.entity_type} #{log.entity_id}</span>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.78rem', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px', maxWidth: '300px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(log.details)}
                    </code>
                  </td>
                  <td>
                    <small style={{ color: 'var(--text-muted)' }}>{log.ip_address || '::1'}</small>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trang trước
          </button>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Trang {page} / {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
};
