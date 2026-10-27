import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InstitutionsPage } from './pages/InstitutionsPage';
import { InstitutionDetailPage } from './pages/InstitutionDetailPage';
import { DepositsPage } from './pages/DepositsPage';
import { DepositDetailPage } from './pages/DepositDetailPage';
import { DepositCreatePage } from './pages/DepositCreatePage';
import { TasksPage } from './pages/TasksPage';
import { ReleasesPage } from './pages/ReleasesPage';
import { ReleaseDetailPage } from './pages/ReleaseDetailPage';
import { AuditPage } from './pages/AuditPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated routes wrapped with Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/institutions" element={<InstitutionsPage />} />
              <Route path="/institutions/:id" element={<InstitutionDetailPage />} />
              <Route path="/deposits" element={<DepositsPage />} />
              <Route path="/deposits/create" element={<DepositCreatePage />} />
              <Route path="/deposits/:id" element={<DepositDetailPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/releases" element={<ReleasesPage />} />
              <Route path="/releases/:id" element={<ReleaseDetailPage />} />
              <Route path="/audit" element={<AuditPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
