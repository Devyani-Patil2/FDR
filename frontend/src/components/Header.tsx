import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Title & Tag */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-black text-lg tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 bg-clip-text text-transparent">
            AICTE FDR GUARDIAN
          </span>
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
            Regulation Bureau
          </span>
        </div>
        <span className="hidden lg:inline text-xs text-slate-400">
          | Security Deposit & FDR Management
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {user.full_name}
              </div>
              <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                {user.role}
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-indigo-600/20 shadow-xs">
              {user.username.slice(0, 2).toUpperCase()}
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
