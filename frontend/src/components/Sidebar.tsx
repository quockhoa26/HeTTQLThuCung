import React from 'react';
import {
  LayoutDashboard,
  Dog,
  Users,
  Sparkles,
  CalendarCheck,
  ReceiptText,
  ShieldAlert,
  LogOut,
  HeartHandshake,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, isOpen }) => {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan (Dashboard)', icon: LayoutDashboard },
    { id: 'pets', label: 'Quản lý Thú cưng', icon: Dog },
    { id: 'orders', label: 'Đơn Mua Thú Cưng', icon: ShoppingBag },
    { id: 'customers', label: 'Quản lý Khách hàng', icon: Users },
    { id: 'services', label: 'Dịch vụ Spa & Chăm sóc', icon: Sparkles },
    { id: 'appointments', label: 'Lịch hẹn (Appointments)', icon: CalendarCheck },
    { id: 'invoices', label: 'Hóa đơn & Thanh toán', icon: ReceiptText },
    ...(isAdmin ? [{ id: 'audit', label: 'Nhật ký Hệ thống', icon: ShieldAlert }] : []),
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-icon">
          <HeartHandshake size={22} />
        </div>
        <div>
          <div className="logo-title">PetCare Pro</div>
          <div className="logo-sub">Hệ Thống Thú Cưng</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.fullName || 'Người dùng'}</div>
            <div className="user-role">
              {user?.role === 'ADMIN' ? '👑 Quản trị viên' : '💼 Nhân viên'}
            </div>
          </div>
          <button
            className="btn btn-outline btn-icon btn-sm"
            onClick={logout}
            title="Đăng xuất"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
