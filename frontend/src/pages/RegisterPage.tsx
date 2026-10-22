import React, { useState } from 'react';
import { UserPlus, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.js';

interface RegisterPageProps {
  onNavigateLogin: (prefilledUsername?: string) => void;
  onNavigatePublic: () => void;
  onNotify?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateLogin,
  onNavigatePublic,
  onNotify,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validateForm = (): string | null => {
    if (!fullName.trim()) return 'Vui lòng nhập họ và tên của bạn.';
    if (fullName.trim().length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';

    if (!phone.trim()) return 'Vui lòng nhập số điện thoại.';
    const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
    if (!phoneRegex.test(phone.trim())) {
      return 'Số điện thoại không hợp lệ (cần đúng 10 số, ví dụ: 0988123456).';
    }

    if (!email.trim()) return 'Vui lòng nhập địa chỉ email.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Địa chỉ email không đúng định dạng (ví dụ: email@domain.com).';
    }

    if (!username.trim()) return 'Vui lòng nhập tên đăng nhập.';
    if (username.trim().length < 3) return 'Tên đăng nhập phải có ít nhất 3 ký tự.';
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username.trim())) {
      return 'Tên đăng nhập chỉ được chứa chữ cái không dấu, chữ số và dấu gạch dưới (_).';
    }

    if (!password) return 'Vui lòng nhập mật khẩu.';
    if (password.length < 6) return 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.';

    if (password !== confirmPassword) {
      return 'Mật khẩu xác nhận không khớp. Vui lòng nhập lại.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password,
        address: address.trim() || undefined,
      });

      if (res.success) {
        const msg = res.message || 'Đăng ký tài khoản khách hàng thành công!';
        setSuccessMsg(msg);
        onNotify?.('success', msg);
        setTimeout(() => {
          onNavigateLogin(username.trim());
        }, 1800);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.';
      setError(errMsg);
      onNotify?.('error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '520px', padding: '36px' }}>
        <button
          type="button"
          onClick={onNavigatePublic}
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          <span>Quay lại trang xem thú cưng</span>
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)',
              marginBottom: '12px',
            }}
          >
            <UserPlus size={28} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
            Đăng Ký Tài Khoản Khách Hàng
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '4px' }}>
            Trở thành thành viên PetCare để đón thú cưng và đặt lịch spa dễ dàng
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '14px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMsg} Đang chuyển tới trang đăng nhập...</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Họ và tên *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Số điện thoại *</label>
              <input
                type="tel"
                className="form-input"
                placeholder="0988123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Email liên hệ *</label>
            <input
              type="email"
              className="form-input"
              placeholder="khachhang@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Tên đăng nhập (Username) *</label>
            <input
              type="text"
              className="form-input"
              placeholder="khachhang01"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Mật khẩu *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Xác nhận mật khẩu *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Địa chỉ (Tùy chọn)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Số nhà, tên đường, Quận/Huyện, Tỉnh/TP"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '18px' }}>
            <ShieldCheck size={16} color="#10b981" />
            <span>Tài khoản sẽ được tự động kích hoạt vai trò <strong>Khách Hàng (CUSTOMER)</strong>.</span>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
            disabled={loading}
          >
            <UserPlus size={18} />
            <span>{loading ? 'Đang tạo tài khoản...' : 'Hoàn tất Đăng Ký'}</span>
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '0.88rem', color: '#64748b' }}>
          Đã có tài khoản?{' '}
          <button
            type="button"
            onClick={() => onNavigateLogin()}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  );
};
