import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface NavbarProps {
  title: string;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ title, onToggleSidebar }) => {
  const { user } = useAuth();

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="btn btn-outline btn-icon"
          onClick={onToggleSidebar}
          style={{ display: 'none' }} /* Visible on mobile via CSS */
        >
          <Menu size={20} />
        </button>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="topbar-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
          <span>Hệ thống trực tuyến (Docker)</span>
        </div>
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>
        <button className="btn btn-outline btn-icon" title="Thông báo">
          <Bell size={18} />
        </button>
        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{user?.username}</span>
      </div>
    </header>
  );
};
