import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant: 'indigo' | 'cyan' | 'amber' | 'emerald' | 'rose';
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  variant,
  subtext,
}) => {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${variant}`}>
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {subtext && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{subtext}</div>}
      </div>
    </div>
  );
};
