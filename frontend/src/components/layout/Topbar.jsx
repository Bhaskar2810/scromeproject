import React from 'react';
import { LogOut, Bell, Shield, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Engine Online</span>
        </div>
        <span className="text-xs text-slate-400 font-mono hidden sm:inline">v1.0.0-resilient</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pr-2 border-r border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800">{user?.fullName}</p>
            <p className="text-[10px] text-slate-500 font-medium capitalize">{user?.role} Access</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
