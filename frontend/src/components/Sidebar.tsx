import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Landmark,
  CheckSquare,
  ArrowRightCircle,
  ScrollText,
  ShieldAlert,
  Shield,
  FileCheck2,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'REVIEWER', 'VERIFIER', 'APPROVER', 'INSTITUTION', 'AUDITOR'],
    },
    {
      to: '/institutions',
      label: 'Institutions',
      icon: Building2,
      roles: ['ADMIN', 'REVIEWER', 'VERIFIER', 'APPROVER', 'AUDITOR'],
    },
    {
      to: '/deposits',
      label: 'FDR Registry',
      icon: Landmark,
      roles: ['ADMIN', 'REVIEWER', 'VERIFIER', 'APPROVER', 'INSTITUTION', 'AUDITOR'],
    },
    {
      to: '/tasks',
      label: 'Tasks & Alerts',
      icon: CheckSquare,
      roles: ['ADMIN', 'REVIEWER', 'VERIFIER', 'APPROVER'],
    },
    {
      to: '/releases',
      label: 'Release Requests',
      icon: ArrowRightCircle,
      roles: ['ADMIN', 'REVIEWER', 'APPROVER', 'INSTITUTION'],
    },
    {
      to: '/audit',
      label: 'Audit Trail',
      icon: ScrollText,
      roles: ['ADMIN', 'AUDITOR', 'REVIEWER'],
    },
  ];

  const visibleNav = navItems.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md ring-2 ring-indigo-500/20">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <span className="font-extrabold text-sm text-white tracking-wide block">
            FDR GUARDIAN
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            AICTE Regulation Bureau
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1.5 flex-1">
        <div className="px-3 pb-2 text-[10px] uppercase tracking-wider font-bold text-slate-500">
          Navigation Menu
        </div>

        {visibleNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Role Banner */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="bg-slate-800/80 rounded-lg p-3 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Current Session
          </span>
          <div className="font-bold text-white mt-0.5 truncate">
            {user?.full_name || 'Guest User'}
          </div>
          <div className="text-[11px] font-semibold text-indigo-400 mt-0.5">
            Role: {user?.role || 'None'}
          </div>
        </div>
      </div>
    </aside>
  );
};
