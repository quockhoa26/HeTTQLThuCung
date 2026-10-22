import React, { useState } from 'react';
import { useAuth } from './context/AuthContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { PublicPetsPage } from './pages/PublicPetsPage.js';
import { CustomerPortal } from './pages/CustomerPortal.js';
import { Sidebar } from './components/Sidebar.js';
import { Navbar } from './components/Navbar.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { PetsPage } from './pages/PetsPage.js';
import { CustomersPage } from './pages/CustomersPage.js';
import { ServicesPage } from './pages/ServicesPage.js';
import { AppointmentsPage } from './pages/AppointmentsPage.js';
import { InvoicesPage } from './pages/InvoicesPage.js';
import { OrdersPage } from './pages/OrdersPage.js';
import { AuditPage } from './pages/AuditPage.js';
import { ToastContainer, ToastMessage } from './components/Toast.js';
import { Appointment } from './types/index.js';

export const App: React.FC = () => {
  const { user, loading, isCustomer } = useAuth();
  const [unauthView, setUnauthView] = useState<'public' | 'login' | 'register'>('public');
  const [prefilledLoginUsername, setPrefilledLoginUsername] = useState<string>('');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [invoicePresetAppointment, setInvoicePresetAppointment] = useState<Appointment | null>(null);

  const [customerFullscreenPublic, setCustomerFullscreenPublic] = useState(false);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="logo-icon" style={{ margin: '0 auto 16px', width: '50px', height: '50px' }}>🐾</div>
          <p>Đang khởi tạo hệ thống PetCare...</p>
        </div>
      </div>
    );
  }

  // 1. Trường hợp Khách CHƯA ĐĂNG NHẬP:
  // Mặc định hiển thị Trang Giới Thiệu Thú Cưng Công Khai (PHẦN 1)
  if (!user) {
    return (
      <>
        {unauthView === 'public' && (
          <PublicPetsPage
            onNavigateLogin={() => setUnauthView('login')}
            onNavigateRegister={() => setUnauthView('register')}
          />
        )}

        {unauthView === 'login' && (
          <LoginPage
            initialUsername={prefilledLoginUsername}
            onNavigateRegister={() => setUnauthView('register')}
            onNavigatePublic={() => setUnauthView('public')}
          />
        )}

        {unauthView === 'register' && (
          <RegisterPage
            onNavigateLogin={(prefilled) => {
              if (prefilled) setPrefilledLoginUsername(prefilled);
              setUnauthView('login');
            }}
            onNavigatePublic={() => setUnauthView('public')}
            onNotify={addToast}
          />
        )}

        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  // 2. Trường hợp ĐÃ ĐĂNG NHẬP với vai trò CUSTOMER (PHẦN 3 & 4):
  // Hiển thị Cổng thông tin dành riêng cho Khách Hàng, không chuyển vào Admin Dashboard!
  if (isCustomer) {
    if (customerFullscreenPublic) {
      return (
        <>
          <div
            style={{
              background: '#0f172a',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#fff',
              position: 'sticky',
              top: 0,
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>🐾</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                Trang Thú Cưng Công Khai (Tài khoản: {user.fullName})
              </span>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '6px 18px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={() => setCustomerFullscreenPublic(false)}
            >
              ← Quay Lại Cổng Khách Hàng
            </button>
          </div>
          <PublicPetsPage
            onNavigateLogin={() => {}}
            onNavigateRegister={() => {}}
            onNavigateCustomerPortal={() => setCustomerFullscreenPublic(false)}
            onBuyPet={(pet) => {
              sessionStorage.setItem('pendingBuyPetId', pet.id.toString());
              setCustomerFullscreenPublic(false);
            }}
          />
          <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </>
      );
    }

    return (
      <>
        <CustomerPortal
          onNotify={addToast}
          onNavigatePublic={() => setCustomerFullscreenPublic(true)}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  // 3. Trường hợp ĐÃ ĐĂNG NHẬP với vai trò ADMIN hoặc STAFF:
  // Hiển thị giao diện quản trị đầy đủ như hiện tại
  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Bảng Điều Khiển Tổng Quan';
      case 'pets':
        return 'Quản Lý Hồ Sơ Thú Cưng';
      case 'orders':
        return 'Quản Lý Đơn Mua Thú Cưng';
      case 'customers':
        return 'Quản Lý Danh Sách Khách Hàng';
      case 'services':
        return 'Dịch Vụ Spa & Chăm Sóc';
      case 'appointments':
        return 'Quản Lý Lịch Hẹn Chăm Sóc';
      case 'invoices':
        return 'Hóa Đơn & Doanh Thu';
      case 'audit':
        return 'Nhật Ký & Kiểm Toán Hệ Thống';
      case 'public-preview':
        return 'Xem Trước Trang Công Khai (Khách Thăm)';
      default:
        return 'Quản Lý Thú Cưng';
    }
  };

  const handleNavigateToInvoiceCreate = (apt: Appointment) => {
    setInvoicePresetAppointment(apt);
    setCurrentTab('invoices');
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-wrapper">
        <Navbar
          title={getPageTitle()}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="content-body">
          {currentTab === 'dashboard' && <DashboardPage />}
          {currentTab === 'pets' && <PetsPage onNotify={addToast} />}
          {currentTab === 'orders' && <OrdersPage onNotify={addToast} />}
          {currentTab === 'customers' && <CustomersPage onNotify={addToast} />}
          {currentTab === 'services' && <ServicesPage onNotify={addToast} />}
          {currentTab === 'appointments' && (
            <AppointmentsPage
              onNotify={addToast}
              onNavigateToInvoiceCreate={handleNavigateToInvoiceCreate}
            />
          )}
          {currentTab === 'invoices' && (
            <InvoicesPage
              onNotify={addToast}
              presetAppointment={invoicePresetAppointment}
            />
          )}
          {currentTab === 'audit' && <AuditPage onNotify={addToast} />}
          {currentTab === 'public-preview' && (
            <PublicPetsPage
              onNavigateLogin={() => {}}
              onNavigateRegister={() => {}}
            />
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
