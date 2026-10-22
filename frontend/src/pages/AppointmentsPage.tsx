import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  PlayCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api.js';
import { Appointment, Customer, Pet, Service } from '../types/index.js';
import { Modal } from '../components/Modal.js';

interface AppointmentsPageProps {
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
  onNavigateToInvoiceCreate?: (appointment: Appointment) => void;
}

export const AppointmentsPage: React.FC<AppointmentsPageProps> = ({ onNotify, onNavigateToInvoiceCreate }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    customerId: 0,
    petId: 0,
    staffId: 0,
    appointmentDate: '',
    serviceIds: [] as number[],
    notes: '',
  });
  const [availablePets, setAvailablePets] = useState<Pet[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.getAppointments({
        search,
        status: statusFilter,
        date: dateFilter,
      });
      if (res.success) {
        setAppointments(res.data);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [cRes, pRes, sRes, uRes] = await Promise.all([
        api.getCustomers({ limit: 100 }),
        api.getPets({ limit: 100 }),
        api.getServices(true),
        api.getUsers(),
      ]);

      if (cRes.success) setCustomers(cRes.data);
      if (pRes.success) setPets(pRes.data);
      if (sRes.success) setServices(sRes.data);
      if (uRes.success) setStaffList(uRes.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [search, statusFilter, dateFilter]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const handleCustomerChange = (custId: number) => {
    setFormData({
      ...formData,
      customerId: custId,
      petId: 0,
    });
    // Filter pets belonging to this customer
    const filtered = pets.filter((p) => p.customer_id === custId);
    setAvailablePets(filtered);
  };

  const toggleServiceSelect = (svcId: number) => {
    setFormData((prev) => {
      const exists = prev.serviceIds.includes(svcId);
      const newIds = exists
        ? prev.serviceIds.filter((id) => id !== svcId)
        : [...prev.serviceIds, svcId];
      return { ...prev, serviceIds: newIds };
    });
  };

  const openCreateModal = () => {
    // Current time + 1 hour as default ISO local
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const dateStr = now.toISOString().slice(0, 16);

    setFormData({
      customerId: customers[0]?.id || 0,
      petId: 0,
      staffId: staffList[0]?.id || 0,
      appointmentDate: dateStr,
      serviceIds: services.length > 0 ? [services[0].id] : [],
      notes: '',
    });

    if (customers.length > 0) {
      const firstCustPets = pets.filter((p) => p.customer_id === customers[0].id);
      setAvailablePets(firstCustPets);
      if (firstCustPets.length > 0) {
        setFormData((prev) => ({ ...prev, petId: firstCustPets[0].id }));
      }
    }

    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.customerId) {
      setFormError('Vui lòng chọn khách hàng');
      return;
    }
    if (!formData.petId) {
      setFormError('Vui lòng chọn thú cưng');
      return;
    }
    if (formData.serviceIds.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 dịch vụ cho lịch hẹn');
      return;
    }
    if (!formData.appointmentDate) {
      setFormError('Vui lòng chọn thời gian bắt đầu lịch hẹn');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: Number(formData.customerId),
        petId: Number(formData.petId),
        staffId: formData.staffId ? Number(formData.staffId) : undefined,
        appointmentDate: new Date(formData.appointmentDate).toISOString(),
        serviceIds: formData.serviceIds,
        notes: formData.notes.trim() || undefined,
      };

      const res = await api.createAppointment(payload);
      onNotify('success', res.message || 'Đặt lịch hẹn thành công');
      setIsFormOpen(false);
      fetchAppointments();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi đặt lịch hẹn');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (apt: Appointment, newStatus: string) => {
    try {
      const res = await api.updateAppointmentStatus(apt.id, newStatus);
      onNotify('success', res.message || 'Cập nhật trạng thái lịch hẹn thành công');
      fetchAppointments();
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể đổi trạng thái lịch hẹn');
    }
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

  return (
    <div>
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <div className="search-input-wrap">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Tìm theo mã lịch, khách hàng, thú cưng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} color="var(--text-muted)" />
            <select
              className="form-select"
              style={{ width: '170px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="CHO_XAC_NHAN">Chờ xác nhận</option>
              <option value="DA_XAC_NHAN">Đã xác nhận</option>
              <option value="DANG_THUC_HIEN">Đang thực hiện</option>
              <option value="HOAN_THANH">Hoàn thành</option>
              <option value="DA_HUY">Đã hủy</option>
            </select>
          </div>

          <input
            type="date"
            className="form-input"
            style={{ width: '160px' }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          {dateFilter && (
            <button className="btn btn-secondary btn-sm" onClick={() => setDateFilter('')}>
              Hôm nay
            </button>
          )}
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Đặt Lịch Hẹn Mới
        </button>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã Lịch</th>
              <th>Thời gian hẹn</th>
              <th>Khách hàng</th>
              <th>Thú cưng</th>
              <th>Dịch vụ yêu cầu</th>
              <th>Nhân viên</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Đang tải danh sách lịch hẹn...
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <CalendarCheck size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div>Không tìm thấy lịch hẹn nào phù hợp</div>
                </td>
              </tr>
            ) : (
              appointments.map((apt) => (
                <tr key={apt.id}>
                  <td><span className="badge badge-neutral">{apt.appointment_code}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {new Date(apt.appointment_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(apt.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>
                      {new Date(apt.appointment_date).toLocaleDateString('vi-VN')}
                    </small>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{apt.customer_name}</div>
                    <small style={{ color: 'var(--text-muted)' }}>{apt.customer_phone}</small>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>🐾 {apt.pet_name}</div>
                    <small style={{ color: 'var(--text-muted)' }}>{apt.pet_species}</small>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {apt.services && apt.services.length > 0 ? (
                        apt.services.map((s, idx) => (
                          <span key={idx} style={{ fontSize: '0.82rem' }}>• {s.name}</span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Không có</span>
                      )}
                    </div>
                  </td>
                  <td>{apt.staff_name || <span style={{ color: 'var(--text-muted)' }}>Chưa chỉ định</span>}</td>
                  <td>{getStatusBadge(apt.status)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {apt.status === 'CHO_XAC_NHAN' && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ marginRight: '6px' }}
                        title="Xác nhận lịch hẹn"
                        onClick={() => handleStatusChange(apt, 'DA_XAC_NHAN')}
                      >
                        <CheckCircle size={14} /> Xác nhận
                      </button>
                    )}
                    {apt.status === 'DA_XAC_NHAN' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginRight: '6px' }}
                        title="Bắt đầu thực hiện"
                        onClick={() => handleStatusChange(apt, 'DANG_THUC_HIEN')}
                      >
                        <PlayCircle size={14} /> Bắt đầu
                      </button>
                    )}
                    {apt.status === 'DANG_THUC_HIEN' && (
                      <button
                        className="btn btn-success btn-sm"
                        style={{ marginRight: '6px' }}
                        title="Hoàn thành lịch hẹn"
                        onClick={() => handleStatusChange(apt, 'HOAN_THANH')}
                      >
                        <CheckCircle size={14} /> Hoàn tất
                      </button>
                    )}
                    {apt.status === 'HOAN_THANH' && onNavigateToInvoiceCreate && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ marginRight: '6px' }}
                        title="Tạo hóa đơn cho lịch này"
                        onClick={() => onNavigateToInvoiceCreate(apt)}
                      >
                        🧾 Hóa đơn
                      </button>
                    )}
                    {apt.status !== 'HOAN_THANH' && apt.status !== 'DA_HUY' && (
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title="Hủy lịch hẹn"
                        onClick={() => handleStatusChange(apt, 'DA_HUY')}
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Đặt lịch hẹn mới */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Đặt Lịch Hẹn Chăm Sóc Thú Cưng"
        maxWidth="680px"
      >
        {formError && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Chọn Khách Hàng (*)</label>
              <select
                className="form-select"
                required
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(parseInt(e.target.value, 10))}
              >
                <option value="0">-- Chọn khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Chọn Thú Cưng (*)</label>
              <select
                className="form-select"
                required
                value={formData.petId}
                onChange={(e) => setFormData({ ...formData, petId: parseInt(e.target.value, 10) })}
              >
                <option value="0">-- Chọn thú cưng --</option>
                {availablePets.map((p) => (
                  <option key={p.id} value={p.id}>
                    🐾 {p.name} ({p.species} - {p.breed || 'N/A'})
                  </option>
                ))}
              </select>
              {formData.customerId > 0 && availablePets.length === 0 && (
                <small style={{ color: 'var(--warning)', marginTop: '4px', display: 'block' }}>
                  Khách hàng này chưa có thú cưng nào. Vui lòng thêm thú cưng trước!
                </small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nhân viên phụ trách</label>
              <select
                className="form-select"
                value={formData.staffId}
                onChange={(e) => setFormData({ ...formData, staffId: parseInt(e.target.value, 10) })}
              >
                <option value="0">-- Chưa phân công nhân viên --</option>
                {staffList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Thời gian bắt đầu (*)</label>
              <input
                type="datetime-local"
                className="form-input"
                required
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Chọn Dịch Vụ Cần Làm (*)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px', maxHeight: '180px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              {services.map((svc) => {
                const isSelected = formData.serviceIds.includes(svc.id);
                return (
                  <div
                    key={svc.id}
                    onClick={() => toggleServiceSelect(svc.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: isSelected ? 'var(--primary-light)' : 'var(--bg-subtle)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                    }}
                  >
                    <input type="checkbox" checked={isSelected} readOnly />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{svc.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {svc.duration_minutes} phút - {new Intl.NumberFormat('vi-VN').format(svc.price)}đ
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ghi chú bổ sung</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Yêu cầu riêng từ chủ, lưu ý chăm sóc..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang kiểm tra lịch & lưu...' : 'Xác nhận Đặt Lịch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
