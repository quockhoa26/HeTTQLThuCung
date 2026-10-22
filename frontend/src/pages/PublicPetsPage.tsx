import React, { useState, useEffect } from 'react';
import {
  Heart,
  Search,
  Filter,
  Sparkles,
  LogIn,
  UserPlus,
  ShieldCheck,
  Activity,
  Eye,
  X,
  Phone,
  CheckCircle,
  Clock,
  HeartHandshake,
  MapPin,
  ShoppingBag
} from 'lucide-react';
import { PublicPet, Service } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

interface PublicPetsPageProps {
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateCustomerPortal?: () => void;
  onBuyPet?: (pet: PublicPet) => void;
}

export const PublicPetsPage: React.FC<PublicPetsPageProps> = ({
  onNavigateLogin,
  onNavigateRegister,
  onNavigateCustomerPortal,
  onBuyPet,
}) => {
  const { user, isCustomer } = useAuth();
  const [pets, setPets] = useState<PublicPet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');
  const [selectedPet, setSelectedPet] = useState<PublicPet | null>(null);

  const fetchPets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPublicPets({
        search: search.trim() || undefined,
        species: species || undefined,
        gender: gender || undefined,
        status: status || undefined,
        limit: 30,
      });
      if (res.success) {
        setPets(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách thú cưng công khai');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.getServices(true);
      if (res.success) {
        setServices(res.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPets();
  }, [species, gender, status]);

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPets();
  };

  const formatPrice = (price: any) => {
    const num = Number(price);
    if (!price || isNaN(num) || num <= 0) return 'Chưa có giá bán (Chưa mở bán)';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const isPetSaleable = (pet: PublicPet | null | undefined) => {
    if (!pet) return false;
    const num = Number(pet.price);
    return !isNaN(num) && num > 0 && pet.status === 'SAN_SANG';
  };

  const handleTriggerBuy = (pet: PublicPet) => {
    setSelectedPet(null);
    if (!user) {
      sessionStorage.setItem('pendingBuyPetId', pet.id.toString());
      onNavigateLogin();
    } else if (onBuyPet) {
      onBuyPet(pet);
    } else {
      onNavigateCustomerPortal?.();
    }
  };

  const getStatusLabel = (petStatus: string) => {
    switch (petStatus) {
      case 'SAN_SANG':
        return { label: 'Sẵn sàng đón về', className: 'status-badge-available' };
      case 'DA_DAT':
        return { label: 'Đã được đặt', className: 'status-badge-reserved' };
      case 'DA_CO_CHU':
        return { label: 'Đã có chủ', className: 'status-badge-adopted' };
      default:
        return { label: 'Sẵn sàng', className: 'status-badge-available' };
    }
  };

  const getDefaultImage = (spec: string) => {
    if (spec === 'Chó') {
      return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80';
    }
    if (spec === 'Mèo') {
      return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80';
    }
    if (spec === 'Chim') {
      return 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600&auto=format&fit=crop&q=80';
    }
    if (spec === 'Cá') {
      return 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop&q=80';
  };

  const calculateAge = (birthDateStr?: string) => {
    if (!birthDateStr) return 'Chưa rõ tuổi';
    const birth = new Date(birthDateStr);
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 1) return 'Dưới 1 tháng';
    if (months < 12) return `${months} tháng tuổi`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths > 0 ? `${years} tuổi ${remMonths} tháng` : `${years} tuổi`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header Navigation */}
      <header className="public-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
            }}
          >
            <HeartHandshake size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
              PetCare Pro
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              Thế Giới Thú Cưng & Dịch Vụ Spa Chuyên Nghiệp
            </div>
          </div>
        </div>

        <nav className="public-nav">
          <a href="#showcase" className="public-nav-link active">
            🐾 Thú Cưng
          </a>
          <a href="#services" className="public-nav-link">
            ✨ Dịch Vụ Spa
          </a>
          <a href="#about" className="public-nav-link">
            ℹ️ Về Chúng Tôi
          </a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                Chào, {user.fullName}
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={onNavigateCustomerPortal}
              >
                {isCustomer ? 'Khu Vực Khách Hàng' : 'Bảng Quản Trị'}
              </button>
            </div>
          ) : (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onNavigateLogin}
                style={{ padding: '8px 16px' }}
              >
                <LogIn size={16} />
                <span>Đăng Nhập</span>
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={onNavigateRegister}
                style={{ padding: '8px 18px' }}
              >
                <UserPlus size={16} />
                <span>Đăng Ký</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. Main Body */}
      <main style={{ flex: 1, padding: '32px 32px 64px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Hero Section */}
        <div className="hero-banner">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={14} />
              <span>Chào mừng bạn đến với Ngôi nhà Thú Cưng PetCare</span>
            </div>
            <h1 className="hero-title">
              Tìm Kiếm & Đón Bé Thú Cưng Đáng Yêu Về Nhà
            </h1>
            <p className="hero-subtitle">
              Mỗi bé thú cưng tại PetCare đều được kiểm tra y tế toàn diện, tiêm chủng đầy đủ,
              chăm sóc dinh dưỡng cao cấp và sẵn sàng trở thành người bạn bốn chân trung thành của bạn.
            </p>

            <div className="hero-features">
              <div className="hero-feature-item">
                <ShieldCheck size={16} color="#4ade80" />
                <span>100% Khỏe mạnh & Đã kiểm tra y tế</span>
              </div>
              <div className="hero-feature-item">
                <CheckCircle size={16} color="#60a5fa" />
                <span>Tiêm phòng & Tẩy giun định kỳ</span>
              </div>
              <div className="hero-feature-item">
                <Heart size={16} color="#f472b6" />
                <span>Bảo hành sức khỏe & Hỗ trợ trọn đời</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Filter & Search Controls */}
        <section id="showcase" style={{ marginBottom: '28px' }}>
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Search form */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search
                  size={18}
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '42px', height: '44px' }}
                  placeholder="Tìm thú cưng theo tên, giống loài (Poodle, Anh lông ngắn, Corgi...)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0 24px', height: '44px' }}>
                <Search size={18} />
                <span>Tìm Kiếm</span>
              </button>
            </form>

            {/* Quick Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontWeight: 600 }}>
                <Filter size={16} />
                <span>Bộ lọc:</span>
              </div>

              {/* Species */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: '', label: 'Tất cả loài' },
                  { id: 'Chó', label: '🐶 Chó' },
                  { id: 'Mèo', label: '🐱 Mèo' },
                  { id: 'Chim', label: '🦜 Chim' },
                  { id: 'Cá', label: '🐠 Cá' },
                  { id: 'Khác', label: '🐾 Khác' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`btn btn-sm ${species === item.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSpecies(item.id)}
                    style={{ borderRadius: 'var(--radius-full)' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

              {/* Gender */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: '', label: 'Tất cả giới tính' },
                  { id: 'Đực', label: 'Đực ♂' },
                  { id: 'Cái', label: 'Cái ♀' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`btn btn-sm ${gender === item.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setGender(item.id)}
                    style={{ borderRadius: 'var(--radius-full)' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

              {/* Status */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: '', label: 'Tất cả trạng thái' },
                  { id: 'SAN_SANG', label: 'Sẵn sàng đón' },
                  { id: 'DA_DAT', label: 'Đã đặt' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`btn btn-sm ${status === item.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStatus(item.id)}
                    style={{ borderRadius: 'var(--radius-full)' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Pet Showcase Grid */}
        <section style={{ marginBottom: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              Danh Sách Thú Cưng Đang Chờ Chủ Mới ({pets.length})
            </h2>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Nhấn vào từng bé để xem hồ sơ sức khỏe & thông tin chi tiết
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <div className="logo-icon" style={{ margin: '0 auto 16px', width: '48px', height: '48px' }}>🐾</div>
              <p>Đang tải danh sách thú cưng...</p>
            </div>
          ) : error ? (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '12px' }}>
              {error}
            </div>
          ) : pets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🐾</div>
              <div className="empty-title">Không tìm thấy thú cưng phù hợp</div>
              <div className="empty-desc">
                Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác để khám phá các bé khác nhé!
              </div>
            </div>
          ) : (
            <div className="public-pet-grid">
              {pets.map((pet) => {
                const statusInfo = getStatusLabel(pet.status);
                const displayImg = pet.image_url || getDefaultImage(pet.species);

                return (
                  <div key={pet.id} className="pet-card">
                    <div className="pet-card-image-wrap">
                      <img
                        src={displayImg}
                        alt={pet.name}
                        className="pet-card-image"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getDefaultImage(pet.species);
                        }}
                      />
                      <span className={`pet-card-status-badge ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                      <span className="pet-card-price-tag">
                        {formatPrice(pet.price)}
                      </span>
                    </div>

                    <div className="pet-card-body">
                      <div className="pet-card-header">
                        <div className="pet-card-name">{pet.name}</div>
                        <span className="pet-card-code">{pet.pet_code}</span>
                      </div>

                      <div className="pet-card-breed">
                        {pet.species} • {pet.breed || 'Chưa rõ giống'}
                      </div>

                      <div className="pet-card-specs">
                        <div className="spec-item">
                          <span>Giới tính:</span>
                          <span className="spec-val">{pet.gender}</span>
                        </div>
                        <div className="spec-item">
                          <span>Tuổi:</span>
                          <span className="spec-val">{calculateAge(pet.birth_date)}</span>
                        </div>
                        <div className="spec-item">
                          <span>Cân nặng:</span>
                          <span className="spec-val">{pet.weight ? `${pet.weight} kg` : 'Chưa rõ'}</span>
                        </div>
                        <div className="spec-item">
                          <span>Màu lông:</span>
                          <span className="spec-val">{pet.fur_color || 'Tự nhiên'}</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px', fontSize: '0.82rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Activity size={14} />
                        <span style={{ fontWeight: 600 }}>Tình trạng: {pet.health_status || 'Khỏe mạnh, tiêm đủ'}</span>
                      </div>

                      <div className="pet-card-footer" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedPet(pet)}
                          style={{ padding: '6px 10px', flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}
                        >
                          <Eye size={14} />
                          <span>Chi tiết</span>
                        </button>
                        {isPetSaleable(pet) ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleTriggerBuy(pet)}
                            style={{
                              padding: '6px 12px',
                              flex: 1.2,
                              justifyContent: 'center',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              borderColor: '#059669',
                              color: 'white',
                            }}
                            title={`Mua ngay bé ${pet.name}`}
                          >
                            <ShoppingBag size={14} />
                            <span>Mua ngay</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled
                            style={{
                              padding: '6px 8px',
                              flex: 1,
                              fontSize: '0.75rem',
                              opacity: 0.75,
                              cursor: 'not-allowed',
                              background: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {pet.status === 'DA_CO_CHU' ? (
                              'Đã có chủ'
                            ) : pet.status === 'DA_DAT' ? (
                              'Đã được đặt'
                            ) : Number(pet.price) <= 0 || !pet.price ? (
                              'Chưa có giá bán'
                            ) : (
                              'Không bán'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 5. Services Showcase */}
        <section id="services" style={{ marginBottom: '60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <Sparkles size={16} />
              Dịch Vụ Chăm Sóc Toàn Diện
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
              Dịch Vụ Spa, Làm Đẹp & Y Tế Thú Cưng
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '8px auto 0' }}>
              Đăng ký tài khoản để dễ dàng đặt lịch hẹn chăm sóc, tắm spa và tiêm phòng cho các bé cưng.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {services.map((svc) => (
              <div
                key={svc.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    {svc.name}
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                    {svc.description || 'Dịch vụ chuyên nghiệp với đội ngũ nhân viên giàu kinh nghiệm và yêu thương động vật.'}
                  </p>
                </div>

                <div style={{ paddingTop: '16px', borderTop: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <Clock size={14} />
                    <span>{svc.duration_minutes} phút</span>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(svc.price)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. About Section */}
        <section
          id="about"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <Heart size={16} /> Về Chúng Tôi
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', marginBottom: '16px' }}>
                Hệ Thống Chăm Sóc & Quản Lý Thú Cưng PetCare Pro
              </h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '16px' }}>
                Chúng tôi cung cấp giải pháp toàn diện từ tìm kiếm thú cưng thuần chủng khỏe mạnh, dịch vụ tắm spa thư giãn, cắt tỉa lông tạo kiểu nghệ thuật cho tới theo dõi hồ sơ y tế và lịch tiêm chủng định kỳ.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color="#4f46e5" />
                  <span>Cơ sở chính: 123 Nguyễn Thị Minh Khai, Quận 1, TP.HCM</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={18} color="#4f46e5" />
                  <span>Hotline hỗ trợ & Đặt lịch: 0988 001 122 / (028) 3999 8888</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="#4f46e5" />
                  <span>Giờ mở cửa: 08:00 - 20:00 (Tất cả các ngày trong tuần)</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #e0e7ff 0%, #fae8ff 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏡</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '8px' }}>
                Bạn Muốn Đón Một Bé Thú Cưng?
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#4338ca', marginBottom: '20px' }}>
                Tạo ngay tài khoản khách hàng để liên hệ nhận nuôi, đặt lịch hẹn đón bé và theo dõi toàn bộ lịch sử chăm sóc tiện lợi!
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={onNavigateRegister}>
                  <UserPlus size={16} />
                  <span>Đăng Ký Tài Khoản</span>
                </button>
                <button className="btn btn-secondary" onClick={onNavigateLogin}>
                  <LogIn size={16} />
                  <span>Đăng Nhập</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Modal Xem Chi Tiết Thú Cưng */}
      {selectedPet && (
        <div className="modal-overlay" onClick={() => setSelectedPet(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px', padding: '0', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: 'relative', height: '280px', backgroundColor: '#f1f5f9' }}>
              <img
                src={selectedPet.image_url || getDefaultImage(selectedPet.species)}
                alt={selectedPet.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getDefaultImage(selectedPet.species);
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => setSelectedPet(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }}
              >
                <X size={18} />
              </button>
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '20px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(6px)',
                  color: 'white',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '1rem',
                  fontWeight: 800,
                }}
              >
                Giá: {formatPrice(selectedPet.price)}
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedPet.name}
                  </h3>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    {selectedPet.species} • {selectedPet.breed || 'Chưa rõ giống'}
                  </span>
                </div>
                <span
                  className={`pet-card-status-badge ${getStatusLabel(selectedPet.status).className}`}
                  style={{ position: 'static' }}
                >
                  {getStatusLabel(selectedPet.status).label}
                </span>
              </div>

              <div className="pet-card-specs" style={{ margin: '16px 0', fontSize: '0.88rem' }}>
                <div className="spec-item">
                  <span>Mã số:</span>
                  <span className="spec-val">{selectedPet.pet_code}</span>
                </div>
                <div className="spec-item">
                  <span>Giới tính:</span>
                  <span className="spec-val">{selectedPet.gender}</span>
                </div>
                <div className="spec-item">
                  <span>Tuổi:</span>
                  <span className="spec-val">{calculateAge(selectedPet.birth_date)}</span>
                </div>
                <div className="spec-item">
                  <span>Cân nặng:</span>
                  <span className="spec-val">{selectedPet.weight ? `${selectedPet.weight} kg` : 'Chưa rõ'}</span>
                </div>
                <div className="spec-item">
                  <span>Màu lông:</span>
                  <span className="spec-val">{selectedPet.fur_color || 'Tự nhiên'}</span>
                </div>
                <div className="spec-item">
                  <span>Sức khỏe:</span>
                  <span className="spec-val" style={{ color: '#16a34a' }}>{selectedPet.health_status || 'Khỏe mạnh'}</span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Mô tả & Đặc điểm tính cách:
                </h4>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.6', background: 'var(--bg-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                  {selectedPet.notes || 'Bé rất năng động, thân thiện và quấn người. Đã được các bác sĩ thú y của PetCare thăm khám và tiêm chủng đầy đủ.'}
                </p>
              </div>

              {/* Action CTA */}
              {isPetSaleable(selectedPet) ? (
                /* 1. THÚ CƯNG ĐỦ ĐIỀU KIỆN MUA NGAY (CÓ GIÁ > 0 VÀ SẴN SÀNG) */
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                    padding: '18px 20px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid #86efac',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={18} color="#16a34a" />
                      Bé {selectedPet.name} đang sẵn sàng về nhà mới!
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#15803d', marginTop: '3px' }}>
                      Giá bán niêm yết: <strong style={{ fontSize: '1rem', color: '#047857' }}>{formatPrice(selectedPet.price)}</strong> • Đặt mua trực tuyến nhận ưu đãi chăm sóc y tế
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderColor: '#059669',
                        color: '#fff',
                        fontWeight: 800,
                        padding: '10px 22px',
                        fontSize: '0.95rem',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                      }}
                      onClick={() => handleTriggerBuy(selectedPet)}
                    >
                      <ShoppingBag size={18} />
                      <span>{user ? 'Mua Ngay Bé Này' : 'Đăng nhập để Mua ngay'}</span>
                    </button>

                    {user && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedPet(null);
                          onNavigateCustomerPortal?.();
                        }}
                      >
                        Vào Cổng Khách Hàng
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* 2. THÚ CƯNG CHƯA CÓ GIÁ BÁN HOẶC ĐÃ ĐƯỢC ĐẶT / ĐÃ CÓ CHỦ (NHƯ MILU) */
                <div
                  style={{
                    background: '#fffbeb',
                    padding: '18px 20px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>ℹ️</span>
                      {selectedPet.status === 'DA_CO_CHU'
                        ? `Bé ${selectedPet.name} đã có chủ sở hữu yêu thương`
                        : selectedPet.status === 'DA_DAT'
                        ? `Bé ${selectedPet.name} đã được đặt giữ chỗ`
                        : `Bé ${selectedPet.name} hiện chưa có giá bán niêm yết`}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#b45309', marginTop: '3px' }}>
                      {selectedPet.status === 'DA_CO_CHU'
                        ? 'Bé đã thuộc về gia đình khác và đang được chăm sóc định kỳ tại PetCare.'
                        : selectedPet.status === 'DA_DAT'
                        ? 'Bé đang chờ kiểm tra sức khỏe và bàn giao cho khách hàng đã đặt.'
                        : 'Bé chưa thuộc diện mở bán trực tuyến theo quy định. Bạn có thể đặt lịch hẹn hoặc liên hệ trung tâm để nhận tư vấn và đón bé.'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled
                      style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        borderColor: '#fde68a',
                        fontWeight: 700,
                        cursor: 'not-allowed',
                        opacity: 0.85,
                      }}
                    >
                      {selectedPet.status === 'DA_CO_CHU'
                        ? 'Đã có chủ'
                        : selectedPet.status === 'DA_DAT'
                        ? 'Đã được đặt'
                        : 'Chưa có giá bán (Chưa mở bán)'}
                    </button>

                    {user ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedPet(null);
                          onNavigateCustomerPortal?.();
                        }}
                      >
                        Vào Cổng Khách Hàng
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedPet(null);
                          onNavigateLogin();
                        }}
                      >
                        <LogIn size={15} />
                        <span>Đăng nhập liên hệ</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Footer */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '32px', textAlign: 'center', fontSize: '0.88rem' }}>
        <p>© 2026 PetCare Management System. Dự án môn Triển khai và Quản trị Hệ thống Phần mềm.</p>
        <p style={{ marginTop: '6px', fontSize: '0.8rem' }}>
          Được phát triển với React, TypeScript, Node.js Express, PostgreSQL và Docker Compose.
        </p>
      </footer>
    </div>
  );
};
