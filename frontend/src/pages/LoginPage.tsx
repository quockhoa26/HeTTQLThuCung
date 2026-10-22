import React, { useState, useEffect } from 'react';
import { HeartHandshake, LogIn, Shield, User as UserIcon, UserCheck, ArrowLeft } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

interface LoginPageProps {
  onNavigateRegister?: () => void;
  onNavigatePublic?: () => void;
  initialUsername?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateRegister,
  onNavigatePublic,
  initialUsername = '',
}) => {
  const { login } = useAuth();
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingBuy, setHasPendingBuy] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('pendingBuyPetId')) {
      setHasPendingBuy(true);
    }
  }, []);

  useEffect(() => {
    if (initialUsername) {
      setUsername(initialUsername);
    }
  }, [initialUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({ username: username.trim(), password });
      if (res.success && res.data) {
        login(res.data.token, res.data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {onNavigatePublic && (
          <button
            type="button"
            onClick={onNavigatePublic}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            <span>Quay lại trang xem thú cưng</span>
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)',
              marginBottom: '14px',
            }}
          >
            <HeartHandshake size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Hệ Thống Quản Lý Thú Cưng
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '6px' }}>
            Đăng nhập để quản lý dịch vụ, lịch hẹn và hồ sơ thú cưng
          </p>
        </div>

        {hasPendingBuy && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              color: '#065f46',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🛍️</span>
            <div>
              <strong>Bạn đang chọn mua thú cưng:</strong> Vui lòng đăng nhập bằng tài khoản Khách Hàng để mở form đặt mua và hoàn tất đơn hàng.
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tên đăng nhập</label>
            <input
              type="text"
              className="form-input"
              placeholder="Nhập tên đăng nhập..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              className="form-input"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            disabled={loading}
          >
            <LogIn size={18} />
            <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập vào hệ thống'}</span>
          </button>
        </form>

        {onNavigateRegister && (
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.88rem', color: '#64748b' }}>
            Chưa có tài khoản?{' '}
            <button
              type="button"
              onClick={onNavigateRegister}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
            >
              Đăng ký tài khoản Khách hàng
            </button>
          </div>
        )}

        <div className="demo-account-box">
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
            🎯 Tài khoản Demo dùng thử nhanh (Click để điền):
          </div>
          <div className="demo-btn-group" style={{ flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={() => fillDemoAccount('admin', 'Admin@123')}
              >
                <Shield size={14} color="#4f46e5" /> Admin
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={() => fillDemoAccount('staff1', 'Staff@123')}
              >
                <UserIcon size={14} color="#0891b2" /> Staff (Lê Văn Bác Sĩ)
              </button>
            </div>

            {/* Test Customer khachhang01 */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}
              onClick={() => fillDemoAccount('khachhang01', 'khoa12345')}
            >
              <UserCheck size={14} /> Khách Hàng Test (khachhang01 / khoa12345)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
