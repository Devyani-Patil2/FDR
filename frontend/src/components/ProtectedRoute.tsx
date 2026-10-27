import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading FDR GUARDIAN Session...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 max-w-lg mx-auto mt-12 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-500 mb-4">
          Your assigned role (<strong>{user.role}</strong>) does not have authorization to view this regulatory bureau section.
        </p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  return <Outlet />;
};
