import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Plus,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
  Power,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api.js';
import { Service } from '../types/index.js';
import { Modal } from '../components/Modal.js';
import { useAuth } from '../context/AuthContext.js';

interface ServicesPageProps {
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onNotify }) => {
  const { isAdmin } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    durationMinutes: '60',
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.getServices();
      if (res.success) {
        setServices(res.data);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể tải danh sách dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      description: '',
      price: '',
      durationMinutes: '60',
      isActive: true,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (svc: Service) => {
    setIsEditing(true);
    setSelectedService(svc);
    setFormData({
      name: svc.name,
      description: svc.description || '',
      price: svc.price.toString(),
      durationMinutes: svc.duration_minutes.toString(),
      isActive: svc.is_active,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập tên dịch vụ');
      return;
    }
    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Giá dịch vụ không hợp lệ');
      return;
    }
    const durationNum = parseInt(formData.durationMinutes, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      setFormError('Thời lượng dịch vụ phải lớn hơn 0 phút');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: priceNum,
        durationMinutes: durationNum,
        isActive: formData.isActive,
      };

      if (isEditing && selectedService) {
        await api.updateService(selectedService.id, payload);
        onNotify('success', `Cập nhật dịch vụ [${payload.name}] thành công`);
      } else {
        await api.createService(payload);
        onNotify('success', `Thêm mới dịch vụ [${payload.name}] thành công`);
      }

      setIsFormOpen(false);
      fetchServices();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi lưu thông tin dịch vụ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (svc: Service) => {
    try {
      const res = await api.toggleServiceStatus(svc.id);
      onNotify('info', res.message || 'Đã thay đổi trạng thái dịch vụ');
      fetchServices();
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể đổi trạng thái dịch vụ');
    }
  };

  const handleDelete = async (svc: Service) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa dịch vụ [${svc.name}]? Nếu dịch vụ này từng có lịch hẹn, hệ thống sẽ tự động chuyển sang "Ngừng cung cấp".`)) {
      return;
    }

    try {
      const res = await api.deleteService(svc.id);
      onNotify('success', res.message || 'Đã xóa dịch vụ');
      fetchServices();
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể xóa dịch vụ');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Danh Mục Dịch Vụ Spa & Chăm Sóc</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Quản lý bảng giá, thời lượng dịch vụ và kích hoạt cung cấp cho khách hàng
          </p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> Thêm Dịch Vụ Mới
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Đang tải danh sách dịch vụ...
        </div>
      ) : services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Sparkles size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <div>Chưa có dịch vụ nào trong hệ thống</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {services.map((svc) => (
            <div
              key={svc.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: svc.is_active ? 1 : 0.65,
                borderLeft: `4px solid ${svc.is_active ? 'var(--primary)' : 'var(--text-subtle)'}`,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{svc.name}</h3>
                  <span className={`badge ${svc.is_active ? 'badge-success' : 'badge-neutral'}`}>
                    {svc.is_active ? 'Đang cung cấp' : 'Ngừng cung cấp'}
                  </span>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px', minHeight: '42px' }}>
                  {svc.description || 'Không có mô tả chi tiết cho dịch vụ này.'}
                </p>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>
                    <DollarSign size={18} />
                    <span>{formatVND(svc.price)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    <Clock size={16} />
                    <span>{svc.duration_minutes} phút</span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                  <button
                    className={`btn btn-sm ${svc.is_active ? 'btn-outline' : 'btn-success'}`}
                    title={svc.is_active ? 'Ngừng cung cấp' : 'Kích hoạt lại'}
                    onClick={() => handleToggleStatus(svc)}
                  >
                    <Power size={14} /> {svc.is_active ? 'Ngừng' : 'Bật'}
                  </button>
                  <button
                    className="btn btn-outline btn-sm btn-icon"
                    title="Chỉnh sửa dịch vụ"
                    onClick={() => openEditModal(svc)}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-danger btn-sm btn-icon"
                    title="Xóa dịch vụ"
                    onClick={() => handleDelete(svc)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Create/Edit */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditing ? `Chỉnh sửa dịch vụ: ${formData.name}` : 'Thêm Dịch Vụ Mới'}
      >
        {formError && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tên dịch vụ (*)</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: Tắm spa thú cưng, Cắt tỉa lông..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Đơn giá (VNĐ) (*)</label>
              <input
                type="number"
                min="0"
                step="5000"
                className="form-input"
                required
                placeholder="VD: 150000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Thời lượng ước tính (Phút) (*)</label>
              <input
                type="number"
                min="5"
                step="5"
                className="form-input"
                required
                placeholder="VD: 60"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả dịch vụ</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Chi tiết các bước thực hiện trong dịch vụ..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            ></textarea>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="isActiveCheck" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
              Kích hoạt cho phép khách hàng đặt ngay
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
