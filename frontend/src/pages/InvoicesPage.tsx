import React, { useEffect, useState } from 'react';
import {
  ReceiptText,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Printer,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { api } from '../services/api.js';
import { Invoice, Customer, Pet, Service } from '../types/index.js';
import { Modal } from '../components/Modal.js';
import { DemoQRCode } from '../components/DemoQRCode.js';

interface InvoicesPageProps {
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
  presetAppointment?: any | null;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ onNotify, presetAppointment }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Pay Modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<'TIEN_MAT' | 'CHUYEN_KHOAN' | 'MA_QR'>('TIEN_MAT');

  // Form Fields
  const [formData, setFormData] = useState({
    customerId: 0,
    petId: 0,
    appointmentId: null as number | null,
    items: [] as Array<{ serviceId: number | null; serviceName: string; quantity: number; unitPrice: number }>,
    paymentMethod: 'TIEN_MAT' as 'TIEN_MAT' | 'CHUYEN_KHOAN' | 'MA_QR',
    status: 'CHUA_THANH_TOAN' as 'CHUA_THANH_TOAN' | 'DA_THANH_TOAN',
    notes: '',
  });
  const [availablePets, setAvailablePets] = useState<Pet[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.getInvoices({
        search,
        status: statusFilter,
        page,
        limit: 10,
      });
      if (res.success) {
        setInvoices(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
        }
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể tải danh sách hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [cRes, pRes, sRes] = await Promise.all([
        api.getCustomers({ limit: 100 }),
        api.getPets({ limit: 100 }),
        api.getServices(true),
      ]);
      if (cRes.success) setCustomers(cRes.data);
      if (pRes.success) setPets(pRes.data);
      if (sRes.success) setServices(sRes.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  // If redirected from appointments page with a completed appointment
  useEffect(() => {
    if (presetAppointment && services.length > 0) {
      openCreateFromAppointment(presetAppointment);
    }
  }, [presetAppointment, services]);

  const openCreateFromAppointment = (apt: any) => {
    const aptItems = (apt.services || []).map((s: any) => ({
      serviceId: s.id,
      serviceName: s.name,
      quantity: 1,
      unitPrice: Number(s.price),
    }));

    setFormData({
      customerId: apt.customer_id,
      petId: apt.pet_id,
      appointmentId: apt.id,
      items: aptItems.length > 0 ? aptItems : [{ serviceId: null, serviceName: 'Dịch vụ tại quầy', quantity: 1, unitPrice: 100000 }],
      paymentMethod: 'TIEN_MAT',
      status: 'CHUA_THANH_TOAN',
      notes: `Hóa đơn cho lịch hẹn ${apt.appointment_code}`,
    });

    const custPets = pets.filter((p) => p.customer_id === apt.customer_id);
    setAvailablePets(custPets);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openCreateModal = () => {
    setFormData({
      customerId: customers[0]?.id || 0,
      petId: 0,
      appointmentId: null,
      items: [
        {
          serviceId: services[0]?.id || null,
          serviceName: services[0]?.name || 'Dịch vụ cơ bản',
          quantity: 1,
          unitPrice: services[0]?.price || 150000,
        },
      ],
      paymentMethod: 'TIEN_MAT',
      status: 'CHUA_THANH_TOAN',
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

  const handleCustomerChange = (custId: number) => {
    setFormData({
      ...formData,
      customerId: custId,
      petId: 0,
    });
    const filtered = pets.filter((p) => p.customer_id === custId);
    setAvailablePets(filtered);
    if (filtered.length > 0) {
      setFormData((prev) => ({ ...prev, petId: filtered[0].id }));
    }
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          serviceId: services[0]?.id || null,
          serviceName: services[0]?.name || 'Dịch vụ thêm',
          quantity: 1,
          unitPrice: services[0]?.price || 50000,
        },
      ],
    }));
  };

  const removeItemRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleServiceSelectInItem = (index: number, svcId: number) => {
    const foundSvc = services.find((s) => s.id === svcId);
    if (foundSvc) {
      setFormData((prev) => {
        const nextItems = [...prev.items];
        nextItems[index] = {
          serviceId: foundSvc.id,
          serviceName: foundSvc.name,
          quantity: nextItems[index].quantity || 1,
          unitPrice: foundSvc.price,
        };
        return { ...prev, items: nextItems };
      });
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const calculatedTotal = formData.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0
  );

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
    if (formData.items.length === 0) {
      setFormError('Hóa đơn cần có ít nhất 1 mục dịch vụ');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        appointmentId: formData.appointmentId || undefined,
        customerId: Number(formData.customerId),
        petId: Number(formData.petId),
        items: formData.items.map((i) => ({
          serviceId: i.serviceId || undefined,
          serviceName: i.serviceName,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
      };

      const res = await api.createInvoice(payload);
      onNotify('success', res.message || 'Tạo hóa đơn thành công');
      setIsFormOpen(false);
      fetchInvoices();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi tạo hóa đơn');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayInvoice = async (inv: Invoice, method: string) => {
    try {
      const res = await api.payInvoice(inv.id, method);
      onNotify('success', res.message || 'Thanh toán hóa đơn thành công');
      fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === inv.id) {
        openDetailModal(inv.id);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Lỗi khi thanh toán hóa đơn');
    }
  };

  const openDetailModal = async (id: number) => {
    try {
      const res = await api.getInvoiceById(id);
      if (res.success) {
        setSelectedInvoice(res.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể lấy thông tin chi tiết hóa đơn');
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
              placeholder="Tìm theo mã hóa đơn, khách hàng, thú cưng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} color="var(--text-muted)" />
            <select
              className="form-select"
              style={{ width: '180px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="CHUA_THANH_TOAN">Chưa thanh toán</option>
              <option value="DA_THANH_TOAN">Đã thanh toán</option>
            </select>
          </div>
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Lập Hóa Đơn Mới
        </button>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã Hóa Đơn</th>
              <th>Khách hàng</th>
              <th>Thú cưng</th>
              <th>Tổng tiền</th>
              <th>Hình thức</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Đang tải danh sách hóa đơn...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <ReceiptText size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div>Chưa có hóa đơn nào</div>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><strong>{inv.invoice_code}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inv.customer_name}</div>
                    <small style={{ color: 'var(--text-muted)' }}>{inv.customer_phone}</small>
                  </td>
                  <td>🐾 {inv.pet_name}</td>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.98rem' }}>
                      {formatVND(Number(inv.total_amount))}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">
                      {inv.payment_method === 'TIEN_MAT'
                        ? '💵 Tiền mặt'
                        : (inv.payment_method === 'MA_QR' || inv.payment_method === 'QR_DEMO')
                        ? '📱 QR Demo'
                        : '🏦 Chuyển khoản'}
                    </span>
                  </td>
                  <td>
                    {inv.status === 'DA_THANH_TOAN' ? (
                      <span className="badge badge-success">✓ Đã thanh toán</span>
                    ) : (inv.payment_method === 'MA_QR' || inv.payment_method === 'QR_DEMO') ? (
                      <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 700 }}>
                        ⏳ Chờ thanh toán demo
                      </span>
                    ) : (
                      <span className="badge badge-danger">Chưa thanh toán</span>
                    )}
                  </td>
                  <td>
                    <small style={{ color: 'var(--text-muted)' }}>
                      {new Date(inv.created_at).toLocaleDateString('vi-VN')}
                    </small>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-outline btn-icon btn-sm"
                      style={{ marginRight: '6px' }}
                      title="Xem chi tiết & In hóa đơn"
                      onClick={() => openDetailModal(inv.id)}
                    >
                      <Eye size={15} />
                    </button>
                    {inv.status === 'CHUA_THANH_TOAN' && (
                      <button
                        className="btn btn-success btn-sm"
                        title="Xác nhận thu tiền hóa đơn"
                        onClick={() => {
                          setPayingInvoice(inv);
                          setPayMethod((inv.payment_method as any) || 'TIEN_MAT');
                          setIsPayModalOpen(true);
                        }}
                      >
                        <CheckCircle size={14} /> Thu tiền
                      </button>
                    )}
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

      {/* Modal Lập Hóa đơn mới */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Lập Hóa Đơn Dịch Vụ Mới"
        maxWidth="720px"
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
              <label className="form-label">Khách hàng (*)</label>
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
              <label className="form-label">Thú cưng (*)</label>
              <select
                className="form-select"
                required
                value={formData.petId}
                onChange={(e) => setFormData({ ...formData, petId: parseInt(e.target.value, 10) })}
              >
                <option value="0">-- Chọn thú cưng --</option>
                {availablePets.map((p) => (
                  <option key={p.id} value={p.id}>
                    🐾 {p.name} ({p.species})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>Các dịch vụ & Chi phí (*)</label>
              <button type="button" className="btn btn-outline btn-sm" onClick={addItemRow}>
                <Plus size={14} /> Thêm dòng
              </button>
            </div>

            {formData.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <select
                  className="form-select"
                  style={{ flex: 2 }}
                  value={item.serviceId || ''}
                  onChange={(e) => handleServiceSelectInItem(idx, parseInt(e.target.value, 10))}
                >
                  <option value="">-- Chọn dịch vụ --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatVND(s.price)})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  className="form-input"
                  style={{ width: '80px' }}
                  placeholder="SL"
                  value={item.quantity}
                  onChange={(e) => {
                    const q = parseInt(e.target.value, 10) || 1;
                    setFormData((prev) => {
                      const nextItems = [...prev.items];
                      nextItems[idx].quantity = q;
                      return { ...prev, items: nextItems };
                    });
                  }}
                />

                <input
                  type="number"
                  step="5000"
                  min="0"
                  className="form-input"
                  style={{ width: '130px' }}
                  placeholder="Đơn giá"
                  value={item.unitPrice}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0;
                    setFormData((prev) => {
                      const nextItems = [...prev.items];
                      nextItems[idx].unitPrice = price;
                      return { ...prev, items: nextItems };
                    });
                  }}
                />

                <div style={{ width: '120px', textAlign: 'right', fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary)' }}>
                  {formatVND(item.quantity * item.unitPrice)}
                </div>

                {formData.items.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger btn-icon btn-sm"
                    onClick={() => removeItemRow(idx)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <div style={{ textAlign: 'right', marginTop: '12px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>Tổng thanh toán (tạm tính): </span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--primary)', marginLeft: '8px' }}>
                {formatVND(calculatedTotal)}
              </strong>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phương thức thanh toán</label>
              <select
                className="form-select"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              >
                <option value="TIEN_MAT">💵 Tiền mặt</option>
                <option value="CHUYEN_KHOAN">🏦 Chuyển khoản ngân hàng</option>
                <option value="MA_QR">📱 QR Demo (Thanh toán mô phỏng)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Trạng thái thanh toán</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="CHUA_THANH_TOAN">Chưa thanh toán</option>
                <option value="DA_THANH_TOAN">Đã thanh toán ngay</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ghi chú hóa đơn</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="VD: Khách gửi bé từ sáng, thanh toán trước..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Xác nhận Xuất Hóa Đơn'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Xem chi tiết & In Hóa đơn */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Chi tiết Hóa Đơn: ${selectedInvoice?.invoice_code}`}
        maxWidth="680px"
      >
        {selectedInvoice && (
          <div>
            <div style={{ border: '2px dashed var(--border-color)', padding: '24px', borderRadius: '12px', background: 'white' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>PETCARE PRO SPA & CLINIC</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Hóa Đơn Dịch Vụ Chăm Sóc Thú Cưng</p>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '4px' }}>Số: {selectedInvoice.invoice_code}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem', marginBottom: '20px' }}>
                <div><strong>Khách hàng:</strong> {selectedInvoice.customer_name}</div>
                <div><strong>Số điện thoại:</strong> {selectedInvoice.customer_phone}</div>
                <div><strong>Thú cưng:</strong> {selectedInvoice.pet_name} ({selectedInvoice.pet_species})</div>
                <div><strong>Ngày lập:</strong> {new Date(selectedInvoice.created_at).toLocaleString('vi-VN')}</div>
              </div>

              <table className="custom-table" style={{ marginBottom: '16px' }}>
                <thead>
                  <tr>
                    <th>Dịch vụ</th>
                    <th style={{ textAlign: 'center' }}>SL</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items && selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.serviceName}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatVND(Number(item.unitPrice))}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatVND(Number(item.amount || item.quantity * item.unitPrice))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Card thông tin Chuyển khoản / QR Demo */}
              {(selectedInvoice.payment_method === 'MA_QR' || selectedInvoice.payment_method === 'QR_DEMO') && (
                <div style={{ margin: '16px 0' }}>
                  <DemoQRCode
                    data={`PETCARE_DEMO|HĐ:${selectedInvoice.invoice_code}|TIEN:${selectedInvoice.total_amount}|THANH TOAN DEMO`}
                    invoiceCode={selectedInvoice.invoice_code}
                    amount={Number(selectedInvoice.total_amount)}
                    showDisclaimer={true}
                  />
                </div>
              )}

              {selectedInvoice.payment_method === 'CHUYEN_KHOAN' && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', margin: '16px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                    <QrCode size={18} color="var(--primary)" />
                    <span>Thông Tin Tài Khoản Chuyển Khoản</span>
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div><strong>Ngân hàng:</strong> MB Bank (Ngân hàng Quân Đội)</div>
                    <div><strong>Số tài khoản:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: '#2563eb' }}>0988001122</span></div>
                    <div><strong>Chủ tài khoản:</strong> PETCARE PRO CLINIC</div>
                    <div><strong>Số tiền:</strong> <span style={{ fontWeight: 700, color: '#dc2626' }}>{formatVND(Number(selectedInvoice.total_amount))}</span></div>
                    <div><strong>Nội dung CK:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{selectedInvoice.invoice_code}</span></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '10px', fontStyle: 'italic' }}>
                    * Nhân viên kiểm tra thông báo tài khoản và bấm xác nhận thu tiền sau khi nhận được thanh toán.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--border-color)', paddingTop: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>Hình thức: </strong>
                    <span className="badge badge-neutral">
                      {selectedInvoice.payment_method === 'TIEN_MAT'
                        ? '💵 Tiền mặt'
                        : (selectedInvoice.payment_method === 'MA_QR' || selectedInvoice.payment_method === 'QR_DEMO')
                        ? '📱 QR Demo'
                        : '🏦 Chuyển khoản'}
                    </span>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <strong>Trạng thái: </strong>
                    {selectedInvoice.status === 'DA_THANH_TOAN' ? (
                      <span className="badge badge-success">
                        {(selectedInvoice.payment_method === 'MA_QR' || selectedInvoice.payment_method === 'QR_DEMO')
                          ? '✓ ĐÃ THANH TOÁN (DEMO)'
                          : '✓ ĐÃ THANH TOÁN'}
                      </span>
                    ) : (selectedInvoice.payment_method === 'MA_QR' || selectedInvoice.payment_method === 'QR_DEMO') ? (
                      <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 700 }}>
                        ⏳ CHỜ THANH TOÁN DEMO
                      </span>
                    ) : (
                      <span className="badge badge-danger">CHƯA THANH TOÁN</span>
                    )}
                    {selectedInvoice.paid_at && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Lúc: {new Date(selectedInvoice.paid_at).toLocaleString('vi-VN')}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tổng cộng thanh toán:</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {formatVND(Number(selectedInvoice.total_amount))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              {selectedInvoice.status === 'CHUA_THANH_TOAN' && (
                <button
                  className="btn btn-success"
                  onClick={() => {
                    setPayingInvoice(selectedInvoice);
                    setPayMethod((selectedInvoice.payment_method as any) || 'TIEN_MAT');
                    setIsPayModalOpen(true);
                  }}
                >
                  <CheckCircle size={16} />
                  {(selectedInvoice.payment_method === 'MA_QR' || selectedInvoice.payment_method === 'QR_DEMO')
                    ? 'Hoàn tất thanh toán Demo'
                    : 'Thu tiền hóa đơn'}
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> In Hóa Đơn
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Xác Nhận Thu Tiền với lựa chọn phương thức */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Xác Nhận Thu Tiền Hóa Đơn"
        maxWidth="520px"
      >
        {payingInvoice && (
          <div>
            <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: '10px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mã hóa đơn:</span>
                <strong style={{ color: 'var(--primary)' }}>{payingInvoice.invoice_code}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Khách hàng:</span>
                <strong>{payingInvoice.customer_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Số tiền cần thu:</span>
                <strong style={{ fontSize: '1.25rem', color: '#16a34a' }}>{formatVND(Number(payingInvoice.total_amount))}</strong>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Chọn phương thức thanh toán thực tế:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {[
                  { id: 'TIEN_MAT', label: '💵 Tiền mặt', desc: 'Khách thanh toán tiền mặt trực tiếp tại quầy' },
                  { id: 'CHUYEN_KHOAN', label: '🏦 Chuyển khoản ngân hàng', desc: 'Khách chuyển tiền qua số tài khoản ngân hàng' },
                  { id: 'MA_QR', label: '📱 QR Demo (Thanh toán mô phỏng)', desc: 'Mã QR giả lập phục vụ kiểm thử và trình diễn trên lớp' },
                ].map((m) => (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 14px',
                      border: `2px solid ${payMethod === m.id ? 'var(--primary)' : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: payMethod === m.id ? '#eef2ff' : 'white',
                    }}
                  >
                    <input
                      type="radio"
                      name="payMethodRadio"
                      value={m.id}
                      checked={payMethod === m.id}
                      onChange={() => setPayMethod(m.id as any)}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{m.label}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {payMethod === 'MA_QR' && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '10px',
                  textAlign: 'center'
                }}>
                  ⏳ Trạng thái: Chờ thanh toán demo
                </div>
                <DemoQRCode
                  data={`PETCARE_DEMO|HĐ:${payingInvoice.invoice_code}|TIEN:${payingInvoice.total_amount}|THANH TOAN DEMO`}
                  invoiceCode={payingInvoice.invoice_code}
                  amount={Number(payingInvoice.total_amount)}
                  showDisclaimer={true}
                />
              </div>
            )}

            {payMethod === 'CHUYEN_KHOAN' && (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                  💳 Thông Tin Tài Khoản Nhận Chuyển Khoản:
                </div>
                <div style={{ fontSize: '0.82rem', lineHeight: '1.6', color: '#334155' }}>
                  <div><strong>Ngân hàng:</strong> MB Bank</div>
                  <div><strong>STK:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>0988001122</span></div>
                  <div><strong>Chủ TK:</strong> PETCARE PRO CLINIC</div>
                  <div><strong>Nội dung:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>{payingInvoice.invoice_code}</span></div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '8px', fontStyle: 'italic' }}>
                  * Nhân viên kiểm tra thông báo tài khoản trước khi nhấn Xác nhận.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPayModalOpen(false)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={async () => {
                  await handlePayInvoice(payingInvoice, payMethod);
                  setIsPayModalOpen(false);
                }}
              >
                <CheckCircle size={16} />
                {payMethod === 'MA_QR'
                  ? 'Hoàn tất thanh toán Demo'
                  : 'Xác nhận đã nhận đủ tiền'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
