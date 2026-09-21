import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { GetStarted } from './pages/GetStarted';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { EntitiesPage } from './pages/EntitiesPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ChartOfAccounts } from './pages/ChartOfAccounts';
import { JournalEntries } from './pages/JournalEntries';
import { Approvals } from './pages/Approvals';
import { GeneralLedger } from './pages/GeneralLedger';
import { ReportsPage } from './pages/ReportsPage';
import { CloseManagerPage } from './pages/CloseManagerPage';
import { SettingsPage } from './pages/SettingsPage';
import { CompanyRegistrationPage } from './pages/CompanyRegistrationPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { CustomersPage } from './pages/CustomersPage';
import { BillsPage } from './pages/BillsPage';
import { VendorsPage } from './pages/VendorsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { BankingPage } from './pages/BankingPage';
import { InventoryPage } from './pages/InventoryPage';
import { GstCenterPage } from './pages/GstCenterPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SubscriptionPage } from './pages/SubscriptionPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/get-started" element={<GetStarted />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<CompanyRegistrationPage />} />
          <Route path="/invite/:token" element={<AcceptInvitationPage />} />

          {/* Authenticated Application Workspace Routes (Protected by AppShell) */}
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/banking" element={<BankingPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/gst" element={<GstCenterPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/entities" element={<EntitiesPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
            <Route path="/journals" element={<JournalEntries />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/ledger" element={<GeneralLedger />} />
            
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/close-manager" element={<CloseManagerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all redirects to public Landing Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
