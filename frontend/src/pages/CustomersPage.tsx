import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Dog,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api.js';
import { Customer } from '../types/index.js';
import { Modal } from '../components/Modal.js';

interface CustomersPageProps {
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ onNotify }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomers({ search, page, limit: 10 });
      if (res.success) {
        setCustomers(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
        }
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, page]);

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setIsEditing(true);
    setSelectedCustomer(cust);
    setFormData({
      fullName: cust.full_name,
      phone: cust.phone,
      email: cust.email || '',
      address: cust.address || '',
      notes: cust.notes || '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openDetailModal = async (cust: Customer) => {
    try {
      const res = await api.getCustomerById(cust.id);
      if (res.success) {
        setSelectedCustomer(res.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể lấy thông tin chi tiết khách hàng');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.fullName.trim()) {
      setFormError('Vui lòng nhập họ và tên khách hàng');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Vui lòng nhập số điện thoại');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (isEditing && selectedCustomer) {
        await api.updateCustomer(selectedCustomer.id, payload);
        onNotify('success', `Cập nhật thông tin khách hàng ${payload.fullName} thành công`);
      } else {
        await api.createCustomer(payload);
        onNotify('success', `Thêm mới khách hàng ${payload.fullName} thành công`);
      }

      setIsFormOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi lưu thông tin khách hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cust: Customer) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khách hàng [${cust.full_name}]? Thao tác này cũng sẽ xóa các hồ sơ thú cưng liên quan.`)) {
      return;
    }

    try {
      await api.deleteCustomer(cust.id);
      onNotify('success', `Đã xóa khách hàng ${cust.full_name}`);
      fetchCustomers();
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể xóa khách hàng');
    }
  };

  return (
    <div>
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Tìm kiếm theo tên, số điện thoại, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Thêm Khách Hàng Mới
        </button>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Họ và Tên</th>
              <th>Số điện thoại</th>
              <th>Email</th>
              <th>Địa chỉ</th>
              <th>Số thú cưng</th>
              <th>Ngày tham gia</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Đang tải danh sách khách hàng...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Users size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div>Không tìm thấy khách hàng nào</div>
                </td>
              </tr>
            ) : (
              customers.map((cust) => (
                <tr key={cust.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{cust.full_name}</div>
                    {cust.notes && <small style={{ color: 'var(--text-muted)' }}>{cust.notes}</small>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} color="var(--primary)" />
                      <span>{cust.phone}</span>
                    </div>
                  </td>
                  <td>
                    {cust.email ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} color="var(--text-muted)" />
                        <span>{cust.email}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)' }}>-</span>
                    )}
                  </td>
                  <td>
                    {cust.address ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <MapPin size={14} color="var(--text-muted)" />
                        <span>{cust.address}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)' }}>-</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontWeight: 700 }}>
                      🐾 {cust.pet_count || 0} bé
                    </span>
                  </td>
                  <td>
                    <small style={{ color: 'var(--text-muted)' }}>
                      {new Date(cust.created_at).toLocaleDateString('vi-VN')}
                    </small>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-outline btn-icon btn-sm"
                      style={{ marginRight: '6px' }}
                      title="Xem chi tiết & Thú cưng"
                      onClick={() => openDetailModal(cust)}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      className="btn btn-outline btn-icon btn-sm"
                      style={{ marginRight: '6px' }}
                      title="Chỉnh sửa"
                      onClick={() => openEditModal(cust)}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      title="Xóa"
                      onClick={() => handleDelete(cust)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {/* Modal Create/Edit */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditing ? `Chỉnh sửa thông tin: ${formData.fullName}` : 'Thêm Khách Hàng Mới'}
      >
        {formError && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Họ và tên khách hàng (*)</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: Nguyễn Văn A..."
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Số điện thoại (*)</label>
              <input
                type="tel"
                className="form-input"
                required
                placeholder="VD: 0901234567..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="VD: email@gmail.com..."
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Địa chỉ</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: 123 Nguyễn Huệ, Quận 1, TP.HCM..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ghi chú khách hàng</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="VD: Khách hàng thân thiết, thường đi công tác..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            ></textarea>
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

      {/* Modal Detail & Pet list */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Thông tin khách hàng: ${selectedCustomer?.full_name}`}
      >
        {selectedCustomer && (
          <div>
            <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: '10px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Họ và tên:</strong> {selectedCustomer.full_name}</div>
              <div><strong>Số điện thoại:</strong> {selectedCustomer.phone}</div>
              <div><strong>Email:</strong> {selectedCustomer.email || 'Chưa cung cấp'}</div>
              <div><strong>Địa chỉ:</strong> {selectedCustomer.address || 'Chưa cung cấp'}</div>
              {selectedCustomer.notes && <div><strong>Ghi chú:</strong> {selectedCustomer.notes}</div>}
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Dog size={18} color="var(--primary)" />
              Danh sách thú cưng của khách hàng:
            </h4>

            {selectedCustomer.pets && selectedCustomer.pets.length > 0 ? (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Mã</th>
                      <th>Tên bé</th>
                      <th>Loài / Giống</th>
                      <th>Cân nặng</th>
                      <th>Sức khỏe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.pets.map((p) => (
                      <tr key={p.id}>
                        <td><span className="badge badge-neutral">{p.pet_code}</span></td>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.species} ({p.breed || 'N/A'})</td>
                        <td>{p.weight ? `${p.weight} kg` : '-'}</td>
                        <td><span className="badge badge-success">{p.health_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Khách hàng này hiện chưa đăng ký thú cưng nào.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
