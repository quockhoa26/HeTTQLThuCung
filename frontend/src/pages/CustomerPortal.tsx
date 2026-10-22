import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  LogOut,
  CalendarCheck,
  ReceiptText,
  User as UserIcon,
  Dog,
  Sparkles,
  Plus,
  Lock,
  X,
  Eye,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Appointment, Invoice, Pet, Service, PetOrder } from '../types/index.js';
import { PublicPetsPage } from './PublicPetsPage.js';
import { DemoQRCode } from '../components/DemoQRCode.js';

interface CustomerPortalProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  onNavigatePublic: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ onNotify, onNavigatePublic }) => {
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'showcase' | 'pets' | 'appointments' | 'orders' | 'invoices' | 'profile'>('showcase');

  // Customer Data states
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [myOrders, setMyOrders] = useState<PetOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Buy Pet Modal states
  const [buyingPet, setBuyingPet] = useState<any | null>(null);
  const [shippingName, setShippingName] = useState(user?.fullName || '');
  const [shippingPhone, setShippingPhone] = useState(user?.phone || '');
  const [shippingAddress, setShippingAddress] = useState(user?.address || '');
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'TIEN_MAT' | 'CHUYEN_KHOAN' | 'QR_DEMO'>('TIEN_MAT');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);

  // Order Detail Modal state
  const [viewingOrder, setViewingOrder] = useState<PetOrder | null>(null);

  // Profile Edit state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<number | ''>('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Invoice Detail Modal
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setShippingName(user.fullName || '');
      setShippingPhone(user.phone || '');
      setShippingAddress(user.address || '');
    }
  }, [user]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const [petsRes, aptsRes, invsRes, svcsRes, ordersRes] = await Promise.all([
        api.getMyPets(),
        api.getAppointments(),
        api.getInvoices(),
        api.getServices(true),
        api.getPetOrders(),
      ]);

      if (petsRes.success) setMyPets(petsRes.data);
      if (aptsRes.success) setAppointments(aptsRes.data);
      if (invsRes.success) setInvoices(invsRes.data);
      if (svcsRes.success) setServices(svcsRes.data);
      if (ordersRes.success) setMyOrders(ordersRes.data);
    } catch (err: any) {
      onNotify('error', err.message || 'Lỗi khi tải dữ liệu tài khoản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [activeTab]);

  useEffect(() => {
    const pendingId = sessionStorage.getItem('pendingBuyPetId');
    if (pendingId) {
      sessionStorage.removeItem('pendingBuyPetId');
      api
        .getPublicPetById(Number(pendingId))
        .then((res) => {
          if (res.success && res.data && Number(res.data.price) > 0 && res.data.status === 'SAN_SANG') {
            handleStartBuy(res.data);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      if (res.success) {
        onNotify('success', 'Cập nhật thông tin cá nhân thành công!');
        await refreshUser();
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      onNotify('error', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      onNotify('error', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        onNotify('success', 'Đổi mật khẩu thành công!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu hiện tại.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetId) {
      onNotify('error', 'Vui lòng chọn thú cưng cho lịch hẹn.');
      return;
    }
    if (selectedServiceIds.length === 0) {
      onNotify('error', 'Vui lòng chọn ít nhất một dịch vụ.');
      return;
    }
    if (!appointmentDate) {
      onNotify('error', 'Vui lòng chọn ngày và giờ hẹn.');
      return;
    }

    setBookingLoading(true);
    try {
      const res = await api.createAppointment({
        customerId: user?.customerId || 0,
        petId: Number(selectedPetId),
        appointmentDate: new Date(appointmentDate).toISOString(),
        serviceIds: selectedServiceIds,
        notes: appointmentNotes.trim() || undefined,
      });

      if (res.success) {
        onNotify('success', 'Đặt lịch hẹn thành công! Đội ngũ nhân viên sẽ sớm xác nhận lịch hẹn của bạn.');
        setShowBookingModal(false);
        setSelectedServiceIds([]);
        setAppointmentDate('');
        setAppointmentNotes('');
        await loadCustomerData();
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể tạo lịch hẹn');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHO_XAC_NHAN':
        return <span className="status-badge status-warning">⏳ Chờ xác nhận</span>;
      case 'DA_XAC_NHAN':
        return <span className="status-badge status-info">✓ Đã xác nhận</span>;
      case 'DANG_THUC_HIEN':
        return <span className="status-badge status-info">🐾 Đang chăm sóc</span>;
      case 'HOAN_THANH':
        return <span className="status-badge status-success">★ Hoàn thành</span>;
      case 'DA_HUY':
        return <span className="status-badge status-danger">✕ Đã hủy</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'CHO_XAC_NHAN':
        return <span className="status-badge status-warning">⏳ Chờ xác nhận</span>;
      case 'DA_XAC_NHAN':
        return <span className="status-badge status-info">📋 Đã xác nhận</span>;
      case 'DANG_GIAO':
        return <span className="status-badge status-info">🚚 Đang giao bé</span>;
      case 'HOAN_THANH':
        return <span className="status-badge status-success">★ Hoàn thành</span>;
      case 'DA_HUY':
        return <span className="status-badge status-danger">✕ Đã hủy</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getPaymentBadge = (status: string, method?: string) => {
    if (status === 'DA_THANH_TOAN') {
      return <span className="status-badge status-success">✓ Đã thanh toán</span>;
    }
    if (method === 'QR_DEMO' || method === 'MA_QR') {
      return (
        <span className="status-badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 700 }}>
          ⏳ Chờ thanh toán demo
        </span>
      );
    }
    return <span className="status-badge status-warning">⏳ Chưa thanh toán</span>;
  };

  const handleStartBuy = (pet: any) => {
    setBuyingPet(pet);
    setShippingName(user?.fullName || '');
    setShippingPhone(user?.phone || '');
    setShippingAddress(user?.address || '');
    setOrderNotes('');
    setOrderPaymentMethod('TIEN_MAT');
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyingPet) return;
    if (!shippingName.trim()) {
      onNotify('error', 'Vui lòng nhập họ tên người nhận.');
      return;
    }
    if (!shippingPhone.trim()) {
      onNotify('error', 'Vui lòng nhập số điện thoại liên hệ.');
      return;
    }
    if (!shippingAddress.trim()) {
      onNotify('error', 'Vui lòng nhập địa chỉ nhận thú cưng / địa chỉ đón bé.');
      return;
    }

    setOrderLoading(true);
    try {
      const res = await api.createPetOrder({
        petId: buyingPet.id,
        paymentMethod: orderPaymentMethod,
        shippingName: shippingName.trim(),
        shippingPhone: shippingPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        notes: orderNotes.trim() || undefined,
      });

      if (res.success) {
        onNotify('success', `Đặt mua bé ${buyingPet.name} thành công! Mã đơn hàng: ${res.data.order_code}`);
        setBuyingPet(null);
        await loadCustomerData();
        setActiveTab('orders');
        setViewingOrder(res.data);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể tạo đơn mua thú cưng');
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div className="customer-portal">
      {/* 1. Customer Topbar */}
      <header className="customer-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <HeartHandshake size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
              PetCare Customer
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cổng Khách Hàng</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="customer-nav">
          <button
            type="button"
            className={`customer-nav-btn ${activeTab === 'showcase' ? 'active' : ''}`}
            onClick={() => setActiveTab('showcase')}
          >
            <Sparkles size={16} />
            <span>Thú Cưng Công Khai</span>
          </button>

          <button
            type="button"
            className={`customer-nav-btn ${activeTab === 'pets' ? 'active' : ''}`}
            onClick={() => setActiveTab('pets')}
          >
            <Dog size={16} />
            <span>Thú Cưng Của Tôi ({myPets.length})</span>
          </button>

          <button
            type="button"
            className={`customer-nav-btn ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <CalendarCheck size={16} />
            <span>Lịch Hẹn Của Tôi ({appointments.length})</span>
          </button>

          <button
            type="button"
            className={`customer-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <ShoppingBag size={16} />
            <span>Đơn Mua Thú Cưng ({myOrders.length})</span>
          </button>

          <button
            type="button"
            className={`customer-nav-btn ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <ReceiptText size={16} />
            <span>Hóa Đơn ({invoices.length})</span>
          </button>

          <button
            type="button"
            className={`customer-nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <UserIcon size={16} />
            <span>Hồ Sơ & Bảo Mật</span>
          </button>
        </nav>

        {/* User Pill & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              {user?.fullName?.charAt(0).toUpperCase() || 'K'}
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{user?.fullName}</div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                background: '#e0e7ff',
                color: '#4338ca',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Khách hàng
            </span>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={logout}
            title="Đăng xuất"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* 2. Main Tab Body */}
      <main style={{ padding: '32px', maxWidth: '1300px', margin: '0 auto', width: '100%', flex: 1 }}>
        {loading && (
          <div style={{ padding: '8px 16px', background: '#e0e7ff', color: '#4338ca', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
            Đang đồng bộ dữ liệu tài khoản...
          </div>
        )}
        {/* TAB 1: SHOWCASE */}
        {activeTab === 'showcase' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigatePublic()}
                style={{ marginBottom: '16px' }}
              >
                ← Mở trang xem thú cưng chế độ toàn màn hình
              </button>
            </div>
            <PublicPetsPage
              onNavigateLogin={() => {}}
              onNavigateRegister={() => {}}
              onNavigateCustomerPortal={() => setActiveTab('appointments')}
              onBuyPet={(pet) => handleStartBuy(pet)}
            />
          </div>
        )}

        {/* TAB 2: MY PETS */}
        {activeTab === 'pets' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Hồ Sơ Thú Cưng Của Tôi
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Danh sách thú cưng của bạn đang được quản lý và chăm sóc y tế tại hệ thống
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setActiveTab('appointments');
                  setShowBookingModal(true);
                }}
              >
                <Plus size={16} />
                <span>Đặt Lịch Chăm Sóc Cho Bé</span>
              </button>
            </div>

            {myPets.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-icon">🐶</div>
                <div className="empty-title">Chưa có thú cưng nào được đăng ký</div>
                <div className="empty-desc">
                  Khi bạn đưa bé tới khám tại PetCare hoặc nhận nuôi một bé từ hệ thống, hồ sơ thú cưng của bạn sẽ tự động xuất hiện tại đây.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {myPets.map((pet) => (
                  <div key={pet.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ height: '180px', position: 'relative', background: '#f1f5f9' }}>
                      <img
                        src={pet.image_url || 'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=600&auto=format&fit=crop&q=80'}
                        alt={pet.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: 'white',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {pet.pet_code}
                      </span>
                    </div>

                    <div style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{pet.name}</h3>
                        <span className="badge badge-primary">{pet.species}</span>
                      </div>

                      <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        {pet.breed || 'Chưa rõ giống'} • Giới tính: {pet.gender}
                      </div>

                      <div className="pet-card-specs" style={{ marginBottom: '16px' }}>
                        <div className="spec-item">
                          <span>Cân nặng:</span>
                          <span className="spec-val">{pet.weight ? `${pet.weight} kg` : 'Chưa rõ'}</span>
                        </div>
                        <div className="spec-item">
                          <span>Màu lông:</span>
                          <span className="spec-val">{pet.fur_color || 'Tự nhiên'}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#16a34a', marginBottom: '16px', fontWeight: 600 }}>
                        ★ Sức khỏe: {pet.health_status || 'Bình thường'}
                      </div>

                      {pet.notes && (
                        <p style={{ fontSize: '0.82rem', color: '#64748b', background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px' }}>
                          Ghi chú: {pet.notes}
                        </p>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%' }}
                        onClick={() => {
                          setSelectedPetId(pet.id);
                          setShowBookingModal(true);
                        }}
                      >
                        <CalendarCheck size={15} />
                        <span>Đặt lịch khám / Spa cho {pet.name}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Lịch Hẹn Chăm Sóc Của Tôi
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Theo dõi tiến độ, thời gian và dịch vụ các lịch hẹn của bạn tại PetCare
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowBookingModal(true)}
              >
                <Plus size={16} />
                <span>Đặt Lịch Hẹn Mới</span>
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-icon">📅</div>
                <div className="empty-title">Bạn chưa có lịch hẹn nào</div>
                <div className="empty-desc">
                  Nhấn vào nút "Đặt Lịch Hẹn Mới" bên trên để đăng ký dịch vụ tắm spa, cắt tỉa lông hoặc khám sức khỏe cho thú cưng!
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã Lịch Hẹn</th>
                      <th>Thú Cưng</th>
                      <th>Thời Gian Hẹn</th>
                      <th>Dịch Vụ Đã Đặt</th>
                      <th>Nhân Viên Phụ Trách</th>
                      <th>Tổng Tiền</th>
                      <th>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {apt.appointment_code}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{apt.pet_name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{apt.pet_species} • {apt.pet_breed}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {new Date(apt.appointment_date).toLocaleDateString('vi-VN')}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {new Date(apt.appointment_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(apt.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {apt.services && apt.services.length > 0 ? (
                              apt.services.map((s, idx) => (
                                <span key={idx} style={{ fontSize: '0.82rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                                  • {s.name}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Chăm sóc định kỳ</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {apt.staff_name ? (
                            <span style={{ fontWeight: 600 }}>{apt.staff_name}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>
                              Đang phân công
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          {formatPrice(apt.total_price || 0)}
                        </td>
                        <td>
                          {getStatusBadge(apt.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: PET ORDERS */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Lịch Sử Đơn Mua Thú Cưng
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Theo dõi trạng thái các đơn đặt mua thú cưng trực tuyến và tiến trình bàn giao bé
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveTab('showcase')}
              >
                <ShoppingBag size={16} />
                <span>Khám Phá Thú Cưng Đang Bán</span>
              </button>
            </div>

            {myOrders.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-icon">🛍️</div>
                <div className="empty-title">Bạn chưa có đơn đặt mua thú cưng nào</div>
                <div className="empty-desc">
                  Khám phá các bé cưng xinh xắn đang được bán tại PetCare để chọn và đón bé về với gia đình bạn nhé!
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: '16px' }}
                  onClick={() => setActiveTab('showcase')}
                >
                  <Sparkles size={16} />
                  <span>Xem Danh Sách Thú Cưng Ngay</span>
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã Đơn Hàng</th>
                      <th>Thú Cưng</th>
                      <th>Giá Bán</th>
                      <th>Phương Thức</th>
                      <th>TT Thanh Toán</th>
                      <th>TT Đơn Hàng</th>
                      <th>Ngày Đặt</th>
                      <th>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {ord.order_code}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {ord.pet_image_url ? (
                              <img
                                src={ord.pet_image_url}
                                alt={ord.pet_name}
                                style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                🐾
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{ord.pet_name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {ord.pet_species} • {ord.pet_breed || 'Chưa rõ giống'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>
                          {formatPrice(ord.total_amount)}
                        </td>
                        <td>
                          {ord.payment_method === 'QR_DEMO' ? (
                            <span style={{ fontWeight: 600, color: '#d97706' }}>📱 QR Demo</span>
                          ) : ord.payment_method === 'CHUYEN_KHOAN' ? (
                            <span style={{ fontWeight: 600, color: '#4f46e5' }}>🏦 Chuyển khoản</span>
                          ) : (
                            <span style={{ fontWeight: 600, color: '#16a34a' }}>💵 Tiền mặt</span>
                          )}
                        </td>
                        <td>
                          {getPaymentBadge(ord.payment_status, ord.payment_method)}
                        </td>
                        <td>
                          {getOrderStatusBadge(ord.order_status)}
                        </td>
                        <td style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                          {new Date(ord.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={async () => {
                              try {
                                const res = await api.getPetOrderById(ord.id);
                                if (res.success) setViewingOrder(res.data);
                              } catch {
                                setViewingOrder(ord);
                              }
                            }}
                          >
                            <Eye size={14} />
                            <span>Chi tiết</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INVOICES */}
        {activeTab === 'invoices' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Hóa Đơn & Lịch Sử Chi Tiêu
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Hóa đơn dịch vụ chăm sóc và mua sắm thú cưng của bạn
              </p>
            </div>

            {invoices.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-icon">🧾</div>
                <div className="empty-title">Bạn chưa có hóa đơn nào</div>
                <div className="empty-desc">
                  Hóa đơn sẽ tự động xuất hiện tại đây khi lịch hẹn của bạn được tạo và thanh toán tại quầy lễ tân.
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã Hóa Đơn</th>
                      <th>Thú Cưng</th>
                      <th>Ngày Tạo</th>
                      <th>Phương Thức</th>
                      <th>Tổng Tiền</th>
                      <th>Trạng Thái</th>
                      <th>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {inv.invoice_code}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.pet_name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{inv.pet_species}</div>
                        </td>
                        <td>
                          {new Date(inv.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td>
                          {(inv.payment_method === 'MA_QR' || inv.payment_method === 'QR_DEMO') ? (
                            <span style={{ fontWeight: 600, color: '#d97706' }}>📱 QR Demo</span>
                          ) : inv.payment_method === 'CHUYEN_KHOAN' ? (
                            <span style={{ fontWeight: 600, color: '#4f46e5' }}>🏦 Chuyển khoản</span>
                          ) : (
                            <span style={{ fontWeight: 600, color: '#16a34a' }}>💵 Tiền mặt</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>
                          {formatPrice(inv.total_amount)}
                        </td>
                        <td>
                          {inv.status === 'DA_THANH_TOAN' ? (
                            <span className="status-badge status-success">✓ Đã thanh toán</span>
                          ) : (inv.payment_method === 'MA_QR' || inv.payment_method === 'QR_DEMO') ? (
                            <span className="status-badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 700 }}>
                              ⏳ Chờ thanh toán demo
                            </span>
                          ) : (
                            <span className="status-badge status-warning">⏳ Chờ thanh toán</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={async () => {
                              try {
                                const res = await api.getInvoiceById(inv.id);
                                if (res.success) setViewingInvoice(res.data);
                              } catch {
                                setViewingInvoice(inv);
                              }
                            }}
                          >
                            <Eye size={14} />
                            <span>Xem chi tiết</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROFILE & SECURITY */}
        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '32px' }}>
            {/* 1. Profile Information */}
            <div className="card">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserIcon size={20} color="var(--primary)" />
                Thông Tin Cá Nhân
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: '20px' }}>
                Cập nhật họ tên, số điện thoại và địa chỉ nhận hỗ trợ
              </p>

              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập (Username)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={user?.username || ''}
                    disabled
                    style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Tên đăng nhập không thể thay đổi
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Họ và tên *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email liên hệ *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0988001122"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ</label>
                  <input
                    type="text"
                    className="form-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Địa chỉ nhà của bạn"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '8px' }}
                  disabled={savingProfile}
                >
                  <span>{savingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                </button>
              </form>
            </div>

            {/* 2. Change Password */}
            <div className="card">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} color="var(--primary)" />
                Bảo Mật & Đổi Mật Khẩu
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: '20px' }}>
                Đổi mật khẩu định kỳ để bảo vệ tài khoản khách hàng của bạn
              </p>

              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label className="form-label">Mật khẩu hiện tại *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Nhập mật khẩu đang dùng"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mật khẩu mới *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Xác nhận mật khẩu mới *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '18px' }}>
                  <ShieldCheck size={16} color="#10b981" />
                  <span>Mật khẩu được mã hóa an toàn với chuẩn bcrypt.</span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={changingPassword}
                >
                  <span>{changingPassword ? 'Đang cập nhật...' : 'Đổi Mật Khẩu'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* 3. Modal Đặt Lịch Hẹn Mới Cho Khách Hàng */}
      {showBookingModal && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Đặt Lịch Hẹn Chăm Sóc Mới</h3>
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => setShowBookingModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBooking}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Chọn Thú Cưng *</label>
                  {myPets.length === 0 ? (
                    <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '8px', color: '#92400e', fontSize: '0.88rem' }}>
                      Bạn chưa có thú cưng nào được đăng ký trong hệ thống. Vui lòng liên hệ quầy lễ tân PetCare hoặc nhân viên chăm sóc để thêm hồ sơ thú cưng trước khi đặt lịch.
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={selectedPetId}
                      onChange={(e) => setSelectedPetId(Number(e.target.value))}
                      required
                    >
                      <option value="">-- Chọn thú cưng của bạn --</option>
                      {myPets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.species} • {p.breed || 'Chưa rõ giống'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Thời Gian Hẹn Khám / Spa *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    Giờ phục vụ: 08:00 - 20:00 hàng ngày.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Dịch Vụ Muốn Đặt * (Có thể chọn nhiều)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                    {services.map((svc) => {
                      const isChecked = selectedServiceIds.includes(svc.id);
                      return (
                        <label key={svc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem', cursor: 'pointer', padding: '4px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedServiceIds([...selectedServiceIds, svc.id]);
                                } else {
                                  setSelectedServiceIds(selectedServiceIds.filter((id) => id !== svc.id));
                                }
                              }}
                            />
                            <span>{svc.name} ({svc.duration_minutes}p)</span>
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {formatPrice(svc.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi Chú Hoặc Yêu Cầu Đặc Biệt</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Ví dụ: Bé nhát nước, cắt móng ngắn vừa phải..."
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBookingModal(false)}>
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={bookingLoading || myPets.length === 0}
                >
                  <span>{bookingLoading ? 'Đang gửi...' : 'Xác Nhận Đặt Lịch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Xem Chi Tiết Hóa Đơn */}
      {viewingInvoice && (
        <div className="modal-overlay" onClick={() => setViewingInvoice(null)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Hóa Đơn: {viewingInvoice.invoice_code}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Ngày tạo: {new Date(viewingInvoice.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => setViewingInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Khách hàng:</span>
                  <span style={{ fontWeight: 600 }}>{viewingInvoice.customer_name || user?.fullName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Thú cưng:</span>
                  <span style={{ fontWeight: 600 }}>{viewingInvoice.pet_name} ({viewingInvoice.pet_species})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Hình thức thanh toán:</span>
                  <span style={{ fontWeight: 600 }}>
                    {(viewingInvoice.payment_method === 'MA_QR' || viewingInvoice.payment_method === 'QR_DEMO')
                      ? '📱 QR Demo (Thanh toán mô phỏng)'
                      : viewingInvoice.payment_method === 'CHUYEN_KHOAN'
                      ? '🏦 Chuyển khoản ngân hàng'
                      : '💵 Tiền mặt tại quầy'}
                  </span>
                </div>
              </div>

              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '8px' }}>Chi Tiết Dịch Vụ</h4>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                <table style={{ width: '100%', fontSize: '0.86rem', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Dịch Vụ</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Đơn Giá</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingInvoice.items && viewingInvoice.items.length > 0 ? (
                      viewingInvoice.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px' }}>{item.serviceName}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatPrice(item.unitPrice)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {formatPrice(item.amount || item.quantity * item.unitPrice)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Dịch vụ chăm sóc tổng hợp
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>Tổng Cộng Thanh Toán</div>
                  <div style={{ fontSize: '0.78rem', color: '#15803d' }}>
                    Trạng thái: {viewingInvoice.status === 'DA_THANH_TOAN'
                      ? '✓ Đã hoàn tất thanh toán'
                      : (viewingInvoice.payment_method === 'MA_QR' || viewingInvoice.payment_method === 'QR_DEMO')
                      ? '⏳ Chờ thanh toán demo'
                      : '⏳ Chờ thanh toán (tại quầy)'}
                  </div>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#166534' }}>
                  {formatPrice(viewingInvoice.total_amount)}
                </div>
              </div>

              {/* Hiển thị QR Demo nếu hóa đơn chưa thanh toán */}
              {viewingInvoice.status !== 'DA_THANH_TOAN' && (viewingInvoice.payment_method === 'MA_QR' || viewingInvoice.payment_method === 'QR_DEMO') && (
                <div style={{ marginTop: '16px' }}>
                  <DemoQRCode
                    data={`PETCARE_DEMO|HĐ:${viewingInvoice.invoice_code}|TIEN:${viewingInvoice.total_amount}|THANH TOAN DEMO`}
                    invoiceCode={viewingInvoice.invoice_code}
                    amount={Number(viewingInvoice.total_amount)}
                    showDisclaimer={true}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '8px', textAlign: 'center', fontStyle: 'italic' }}>
                    * Vui lòng liên hệ nhân viên thu ngân PetCare để xác nhận thanh toán demo.
                  </div>
                </div>
              )}

              {/* Hiển thị thông tin Chuyển khoản nếu hóa đơn chưa thanh toán */}
              {viewingInvoice.status !== 'DA_THANH_TOAN' && viewingInvoice.payment_method === 'CHUYEN_KHOAN' && (
                <div style={{
                  marginTop: '16px',
                  padding: '14px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '8px', fontSize: '0.9rem' }}>
                    🏦 Thông tin tài khoản chuyển khoản
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.6, textAlign: 'left', maxWidth: '320px', margin: '0 auto' }}>
                    <div>🏦 <strong>Ngân hàng:</strong> MB Bank (Quân Đội)</div>
                    <div>🔢 <strong>Số tài khoản:</strong> <code>0988001122</code></div>
                    <div>👤 <strong>Chủ tài khoản:</strong> PETCARE PRO CLINIC</div>
                    <div>💵 <strong>Số tiền:</strong> {formatPrice(viewingInvoice.total_amount)}</div>
                    <div>📝 <strong>Nội dung CK:</strong> <code style={{ color: '#dc2626', fontWeight: 700 }}>{viewingInvoice.invoice_code}</code></div>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '10px', fontStyle: 'italic' }}>
                    * Lưu ý: Sau khi quý khách chuyển khoản thành công, nhân viên thu ngân sẽ kiểm tra đối soát và xác nhận hóa đơn.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setViewingInvoice(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ĐẶT MUA THÚ CƯNG TRỰC TUYẾN */}
      {buyingPet && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} color="var(--primary)" />
                <h3 className="modal-title">Xác Nhận Đặt Mua Thú Cưng Trực Tuyến</h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setBuyingPet(null)}
                disabled={orderLoading}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmOrder}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Pet summary card */}
                <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-subtle)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                  <img
                    src={buyingPet.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'}
                    alt={buyingPet.name}
                    style={{ width: '90px', height: '90px', borderRadius: '10px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                        {buyingPet.name}
                      </h4>
                      <span className="badge badge-primary">{buyingPet.species}</span>
                    </div>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Giống: {buyingPet.breed || 'Chưa rõ'} • Giới tính: {buyingPet.gender}
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Giá niêm yết:</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                        {formatPrice(buyingPet.price)}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.82rem', color: '#166534', marginBottom: '16px' }}>
                  🛡️ <strong>Chính sách giữ chỗ độc quyền:</strong> Khi bạn đặt mua, hệ thống sẽ tự động cập nhật thú cưng sang trạng thái <strong>Đã Đặt (DA_DAT)</strong> để ngăn chặn mua trùng.
                </div>

                {/* Receiver Info */}
                <h4 style={{ fontSize: '0.94rem', fontWeight: 700, marginBottom: '12px', color: '#334155' }}>
                  Thông Tin Giao Nhận & Liên Hệ
                </h4>

                <div className="form-group">
                  <label className="form-label">Họ và tên người nhận *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Số điện thoại liên hệ *</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    placeholder="0988001122"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ nhận bé / Địa chỉ đón *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div className="form-group">
                  <label className="form-label">Phương thức thanh toán *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: `2px solid ${orderPaymentMethod === 'TIEN_MAT' ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: '10px', cursor: 'pointer', background: orderPaymentMethod === 'TIEN_MAT' ? '#eef2ff' : 'white' }}>
                      <input
                        type="radio"
                        name="orderPaymentMethod"
                        value="TIEN_MAT"
                        checked={orderPaymentMethod === 'TIEN_MAT'}
                        onChange={() => setOrderPaymentMethod('TIEN_MAT')}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>💵 Tiền mặt khi nhận thú cưng</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Thanh toán trực tiếp khi nhận bé tại nhà hoặc đón tại trung tâm PetCare</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: `2px solid ${orderPaymentMethod === 'CHUYEN_KHOAN' ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: '10px', cursor: 'pointer', background: orderPaymentMethod === 'CHUYEN_KHOAN' ? '#eef2ff' : 'white' }}>
                      <input
                        type="radio"
                        name="orderPaymentMethod"
                        value="CHUYEN_KHOAN"
                        checked={orderPaymentMethod === 'CHUYEN_KHOAN'}
                        onChange={() => setOrderPaymentMethod('CHUYEN_KHOAN')}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>🏦 Chuyển khoản ngân hàng</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Chuyển khoản qua số tài khoản MB Bank chính thức của PetCare</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: `2px solid ${orderPaymentMethod === 'QR_DEMO' ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: '10px', cursor: 'pointer', background: orderPaymentMethod === 'QR_DEMO' ? '#eef2ff' : 'white' }}>
                      <input
                        type="radio"
                        name="orderPaymentMethod"
                        value="QR_DEMO"
                        checked={orderPaymentMethod === 'QR_DEMO'}
                        onChange={() => setOrderPaymentMethod('QR_DEMO')}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#d97706' }}>📱 QR Demo (Thanh toán mô phỏng)</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mô phỏng quét mã QR để kiểm thử và trình diễn đồ án môn học</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú thêm cho nhân viên</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Khung giờ thuận tiện để đón bé, dặn dò dinh dưỡng..."
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Tổng thanh toán:</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>
                    {formatPrice(buyingPet.price)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setBuyingPet(null)}
                    disabled={orderLoading}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={orderLoading}
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#10b981' }}
                  >
                    {orderLoading ? 'Đang tạo đơn...' : 'Xác Nhận Đặt Mua'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHI TIẾT ĐƠN MUA THÚ CƯNG */}
      {viewingOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={20} color="var(--primary)" />
                  <h3 className="modal-title">Đơn Mua Thú Cưng #{viewingOrder.order_code}</h3>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Ngày tạo: {new Date(viewingOrder.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => setViewingOrder(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Trạng thái đơn hàng</div>
                  <div style={{ marginTop: '4px' }}>{getOrderStatusBadge(viewingOrder.order_status)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Thanh toán</div>
                  <div style={{ marginTop: '4px' }}>{getPaymentBadge(viewingOrder.payment_status, viewingOrder.payment_method)}</div>
                </div>
              </div>

              {/* Pet Info */}
              <h4 style={{ fontSize: '0.94rem', fontWeight: 700, marginBottom: '10px', color: '#334155' }}>
                Thông Tin Thú Cưng
              </h4>
              <div style={{ display: 'flex', gap: '14px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '16px' }}>
                {viewingOrder.pet_image_url ? (
                  <img
                    src={viewingOrder.pet_image_url}
                    alt={viewingOrder.pet_name}
                    style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '70px', height: '70px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                    🐾
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{viewingOrder.pet_name}</div>
                    <span className="badge badge-primary">{viewingOrder.pet_species}</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Mã pet: {viewingOrder.pet_code} • Giống: {viewingOrder.pet_breed || 'Chưa rõ'}
                  </div>
                  <div style={{ fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                    Đơn giá: {formatPrice(viewingOrder.unit_price)}
                  </div>
                </div>
              </div>

              {/* Shipping Info */}
              <h4 style={{ fontSize: '0.94rem', fontWeight: 700, marginBottom: '10px', color: '#334155' }}>
                Thông Tin Giao Nhận & Liên Hệ
              </h4>
              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.86rem', lineHeight: '1.6', marginBottom: '16px' }}>
                <div>👤 <strong>Người nhận:</strong> {viewingOrder.shipping_name || user?.fullName}</div>
                <div>📞 <strong>Điện thoại:</strong> {viewingOrder.shipping_phone || user?.phone || 'Chưa cung cấp'}</div>
                <div>📍 <strong>Địa chỉ nhận:</strong> {viewingOrder.shipping_address || 'Nhận tại quầy trung tâm PetCare'}</div>
                {viewingOrder.notes && (
                  <div style={{ marginTop: '4px', color: '#64748b' }}>📝 <strong>Ghi chú:</strong> {viewingOrder.notes}</div>
                )}
              </div>

              {/* Total Card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>Tổng Tiền Đơn Hàng</div>
                  <div style={{ fontSize: '0.78rem', color: '#15803d' }}>
                    Hình thức: {viewingOrder.payment_method === 'QR_DEMO' ? '📱 QR Demo' : viewingOrder.payment_method === 'CHUYEN_KHOAN' ? '🏦 Chuyển khoản' : '💵 Tiền mặt'}
                  </div>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#166534' }}>
                  {formatPrice(viewingOrder.total_amount)}
                </div>
              </div>

              {/* QR Demo if Unpaid */}
              {viewingOrder.payment_status !== 'DA_THANH_TOAN' && viewingOrder.payment_method === 'QR_DEMO' && (
                <div style={{ marginTop: '16px' }}>
                  <DemoQRCode
                    data={`PETCARE_PET_ORDER|CODE:${viewingOrder.order_code}|PET:${viewingOrder.pet_name}|TIEN:${viewingOrder.total_amount}|THANH TOAN DEMO`}
                    invoiceCode={viewingOrder.order_code}
                    amount={Number(viewingOrder.total_amount)}
                    showDisclaimer={true}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '8px', textAlign: 'center', fontStyle: 'italic' }}>
                    * Đây là mã QR thanh toán demo mô phỏng phục vụ học tập, không phải giao dịch thật. Nhân viên sẽ xác nhận đơn hàng sau khi bạn hoàn tất.
                  </div>
                </div>
              )}

              {/* Bank Transfer info if unpaid */}
              {viewingOrder.payment_status !== 'DA_THANH_TOAN' && viewingOrder.payment_method === 'CHUYEN_KHOAN' && (
                <div style={{
                  marginTop: '16px',
                  padding: '14px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '8px', fontSize: '0.9rem' }}>
                    🏦 Thông tin tài khoản chuyển khoản
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.6, textAlign: 'left', maxWidth: '320px', margin: '0 auto' }}>
                    <div>🏦 <strong>Ngân hàng:</strong> MB Bank (Quân Đội)</div>
                    <div>🔢 <strong>Số tài khoản:</strong> <code>0988001122</code></div>
                    <div>👤 <strong>Chủ tài khoản:</strong> PETCARE PRO CLINIC</div>
                    <div>💵 <strong>Số tiền:</strong> {formatPrice(viewingOrder.total_amount)}</div>
                    <div>📝 <strong>Nội dung CK:</strong> <code style={{ color: '#dc2626', fontWeight: 700 }}>{viewingOrder.order_code}</code></div>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '10px', fontStyle: 'italic' }}>
                    * Nhân viên PetCare sẽ kiểm tra giao dịch và liên hệ xác nhận bàn giao thú cưng cho bạn.
                  </div>
                </div>
              )}

              {/* Cash instruction */}
              {viewingOrder.payment_status !== 'DA_THANH_TOAN' && viewingOrder.payment_method === 'TIEN_MAT' && (
                <div style={{ padding: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '0.82rem', color: '#1e40af' }}>
                  💵 <strong>Thanh toán tiền mặt:</strong> Bạn vui lòng chuẩn bị số tiền <strong>{formatPrice(viewingOrder.total_amount)}</strong> khi nhân viên giao thú cưng tới địa chỉ của bạn hoặc khi bạn tới trung tâm đón bé.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setViewingOrder(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
