import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Key, Mail, Clock, CheckCircle } from 'lucide-react';

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">User Account & Credentials</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your active session identity and role permissions</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-600/20">
            {user?.username?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{user?.fullName}</h3>
            <p className="text-xs text-slate-500">@{user?.username}</p>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase mt-1">
              Role: {user?.role}
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" /> Email Address
            </span>
            <span className="font-semibold text-slate-900">{user?.email}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" /> Account Status
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
              <CheckCircle className="w-3.5 h-3.5" /> Active
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-400" /> System Identifier (ID)
            </span>
            <span className="font-mono text-slate-600">{user?._id || 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Member Since
            </span>
            <span className="text-slate-600">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
