import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Truck,
  XCircle,
  CreditCard,
  X,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api.js';
import { PetOrder } from '../types/index.js';

interface OrdersPageProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ onNotify }) => {
  const [orders, setOrders] = useState<PetOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewingOrder, setViewingOrder] = useState<PetOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getPetOrders();
      if (res.success) {
        setOrders(res.data);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Lỗi khi tải danh sách đơn mua thú cưng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    if (!window.confirm(`Bạn có chắc muốn chuyển trạng thái đơn hàng sang "${newStatus}"?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.updateOrderStatus(orderId, newStatus);
      if (res.success) {
        onNotify('success', `Cập nhật trạng thái đơn hàng thành công!`);
        await fetchOrders();
        if (viewingOrder && viewingOrder.id === orderId) {
          setViewingOrder(res.data);
        }
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể cập nhật trạng thái đơn hàng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId: number) => {
    if (!window.confirm(`Xác nhận khách hàng đã thanh toán đơn này?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.payPetOrder(orderId);
      if (res.success) {
        onNotify('success', 'Xác nhận thanh toán thành công!');
        await fetchOrders();
        if (viewingOrder && viewingOrder.id === orderId) {
          setViewingOrder(res.data);
        }
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể xác nhận thanh toán');
    } finally {
      setActionLoading(false);
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

  const filteredOrders = orders.filter((ord) => {
    const matchesStatus = statusFilter === 'ALL' || ord.order_status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      ord.order_code?.toLowerCase().includes(q) ||
      ord.customer_name?.toLowerCase().includes(q) ||
      ord.shipping_name?.toLowerCase().includes(q) ||
      ord.shipping_phone?.includes(q) ||
      ord.pet_name?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = orders
    .filter((o) => o.payment_status === 'DA_THANH_TOAN' && o.order_status !== 'DA_HUY')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const pendingCount = orders.filter((o) => o.order_status === 'CHO_XAC_NHAN').length;
  const shippingCount = orders.filter((o) => o.order_status === 'DANG_GIAO').length;
  const completedCount = orders.filter((o) => o.order_status === 'HOAN_THANH').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metric summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tổng số đơn hàng</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{orders.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ⏳
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chờ xác nhận</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>{pendingCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đang giao bé</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>{shippingCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✓
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đã hoàn thành</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>{completedCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ★
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Doanh thu đã thu</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#059669' }}>{formatPrice(totalRevenue)}</div>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '280px' }}>
            <div className="search-bar" style={{ width: '100%' }}>
              <Search size={16} />
              <input
                type="text"
                placeholder="Tìm mã đơn, tên khách, số điện thoại, tên thú cưng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} color="var(--text-muted)" />
              <select
                className="form-input"
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="CHO_XAC_NHAN">Chờ xác nhận</option>
                <option value="DA_XAC_NHAN">Đã xác nhận</option>
                <option value="DANG_GIAO">Đang giao bé</option>
                <option value="HOAN_THANH">Đã hoàn thành</option>
                <option value="DA_HUY">Đã hủy</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchOrders}
              disabled={loading}
              title="Tải lại dữ liệu"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Khách Hàng / Nhận</th>
                <th>Thú Cưng</th>
                <th>Giá Bán</th>
                <th>Phương Thức</th>
                <th>Thanh Toán</th>
                <th>Trạng Thái</th>
                <th>Ngày Tạo</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Đang tải danh sách đơn hàng...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Không tìm thấy đơn mua thú cưng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {ord.order_code}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ord.shipping_name || ord.customer_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ord.shipping_phone}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {ord.pet_image_url ? (
                          <img
                            src={ord.pet_image_url}
                            alt={ord.pet_name}
                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            🐾
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{ord.pet_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {ord.pet_species} • {ord.pet_code}
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
                    <td style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      {new Date(ord.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setViewingOrder(ord)}
                      >
                        <Eye size={14} />
                        <span>Xem & Xử lý</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: DETAIL & PROCESS ORDER */}
      {viewingOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={20} color="var(--primary)" />
                  <h3 className="modal-title">Xử Lý Đơn Mua Thú Cưng #{viewingOrder.order_code}</h3>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Ngày tạo: {new Date(viewingOrder.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setViewingOrder(null)}
                disabled={actionLoading}
              >
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

              {/* Shipping info */}
              <h4 style={{ fontSize: '0.94rem', fontWeight: 700, marginBottom: '10px', color: '#334155' }}>
                Thông Tin Giao Nhận & Khách Hàng
              </h4>
              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.86rem', lineHeight: '1.6', marginBottom: '16px' }}>
                <div>👤 <strong>Khách hàng:</strong> {viewingOrder.customer_name} ({viewingOrder.customer_email || 'Chưa có email'})</div>
                <div>📦 <strong>Người nhận:</strong> {viewingOrder.shipping_name}</div>
                <div>📞 <strong>Điện thoại nhận:</strong> {viewingOrder.shipping_phone}</div>
                <div>📍 <strong>Địa chỉ giao nhận:</strong> {viewingOrder.shipping_address}</div>
                {viewingOrder.notes && (
                  <div style={{ marginTop: '4px', color: '#64748b' }}>📝 <strong>Ghi chú:</strong> {viewingOrder.notes}</div>
                )}
              </div>

              {/* Total Card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>Tổng Tiền Đơn Hàng</div>
                  <div style={{ fontSize: '0.78rem', color: '#15803d' }}>
                    Phương thức: {viewingOrder.payment_method === 'QR_DEMO' ? '📱 QR Demo' : viewingOrder.payment_method === 'CHUYEN_KHOAN' ? '🏦 Chuyển khoản' : '💵 Tiền mặt'}
                  </div>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#166534' }}>
                  {formatPrice(viewingOrder.total_amount)}
                </div>
              </div>

              {/* ACTION BUTTONS FOR STAFF/ADMIN */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', color: '#0f172a' }}>
                  Thao Tác Xử Lý Đơn Hàng
                </h4>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {viewingOrder.order_status === 'CHO_XAC_NHAN' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleUpdateStatus(viewingOrder.id, 'DA_XAC_NHAN')}
                      disabled={actionLoading}
                    >
                      <CheckCircle2 size={15} />
                      <span>Xác Nhận Đơn Hàng</span>
                    </button>
                  )}

                  {viewingOrder.order_status === 'DA_XAC_NHAN' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ background: '#0284c7', borderColor: '#0284c7' }}
                      onClick={() => handleUpdateStatus(viewingOrder.id, 'DANG_GIAO')}
                      disabled={actionLoading}
                    >
                      <Truck size={15} />
                      <span>Bắt Đầu Giao Bé</span>
                    </button>
                  )}

                  {(viewingOrder.order_status === 'DANG_GIAO' || viewingOrder.order_status === 'DA_XAC_NHAN') && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ background: '#10b981', borderColor: '#10b981' }}
                      onClick={() => handleUpdateStatus(viewingOrder.id, 'HOAN_THANH')}
                      disabled={actionLoading}
                    >
                      <CheckCircle2 size={15} />
                      <span>Hoàn Thành & Chuyển Quyền Sở Hữu Bé</span>
                    </button>
                  )}

                  {viewingOrder.payment_status !== 'DA_THANH_TOAN' && viewingOrder.order_status !== 'DA_HUY' && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ borderColor: '#10b981', color: '#059669' }}
                      onClick={() => handleConfirmPayment(viewingOrder.id)}
                      disabled={actionLoading}
                    >
                      <CreditCard size={15} />
                      <span>Xác Nhận Đã Nhận Tiền</span>
                    </button>
                  )}

                  {viewingOrder.order_status !== 'HOAN_THANH' && viewingOrder.order_status !== 'DA_HUY' && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleUpdateStatus(viewingOrder.id, 'DA_HUY')}
                      disabled={actionLoading}
                    >
                      <XCircle size={15} />
                      <span>Hủy Đơn (Trả Bé Về Sẵn Sàng Bán)</span>
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                  * Lưu ý: Khi đơn hàng được chuyển sang "Hoàn thành", thú cưng sẽ chính thức cập nhật trạng thái "Đã có chủ" (DA_CO_CHU) và gán khách hàng này làm chủ sở hữu. Nếu hủy đơn, thú cưng sẽ tự động hoàn về trạng thái "Sẵn sàng" (SAN_SANG).
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingOrder(null)}
                disabled={actionLoading}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
