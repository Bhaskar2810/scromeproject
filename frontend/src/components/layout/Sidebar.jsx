import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  GitBranch,
  Sliders,
  UserCheck,
  History,
  Activity,
  User,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Requests', href: '/requests', icon: FileSpreadsheet },
  { name: 'New Request', href: '/requests/new', icon: PlusCircle },
  { name: 'Manual Review', href: '/reviews', icon: UserCheck, badgeRole: ['admin', 'reviewer'] },
  { name: 'Workflows', href: '/workflows', icon: GitBranch },
  { name: 'Rules Engine', href: '/rules', icon: Sliders },
  { name: 'Audit Trail', href: '/audit', icon: History },
  { name: 'System Health', href: '/system', icon: Activity },
  { name: 'My Profile', href: '/profile', icon: User }
];

const Sidebar = () => {
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col flex-shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-wide leading-tight">RESILIENT</h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Decision Platform</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-900/60 border border-indigo-700/60 flex items-center justify-center font-bold text-xs text-indigo-200">
            {user?.username?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{user?.fullName || user?.username}</p>
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800/40 uppercase">
              {user?.role || 'User'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
