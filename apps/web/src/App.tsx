'use client';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { InternalAuthProvider } from './context/InternalAuthContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './views/LandingPage';
import { GetStarted } from './views/GetStarted';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { EntitiesPage } from './views/EntitiesPage';
import { AuditLogPage } from './views/AuditLogPage';
import { ChartOfAccounts } from './views/ChartOfAccounts';
import { JournalEntries } from './views/JournalEntries';
import { Approvals } from './views/Approvals';
import { GeneralLedger } from './views/GeneralLedger';
import { ReportsPage } from './views/ReportsPage';
import { CloseManagerPage } from './views/CloseManagerPage';
import { SettingsPage } from './views/SettingsPage';
import { SecurityPage } from './views/SecurityPage';
import { CompanyRegistrationPage } from './views/CompanyRegistrationPage';
import { AcceptInvitationPage } from './views/AcceptInvitationPage';
import { InvoicesPage } from './views/InvoicesPage';
import { CustomersPage } from './views/CustomersPage';
import { BillsPage } from './views/BillsPage';
import { VendorsPage } from './views/VendorsPage';
import { ExpensesPage } from './views/ExpensesPage';
import { BankingPage } from './views/BankingPage';
import { InventoryPage } from './views/InventoryPage';
import { Items } from './views/Items';
import { GstCenterPage } from './views/GstCenterPage';
import { ProjectsPage } from './views/ProjectsPage';
import { SubscriptionPage } from './views/SubscriptionPage';
import { PublicInvoicePage } from './views/PublicInvoicePage';

// Internal Demo Management Portal
import { InternalProtectedRoute } from './components/internal/InternalProtectedRoute';
import { InternalLayout } from './components/internal/InternalLayout';
import { InternalLogin } from './views/internal/InternalLogin';
import { InternalDashboard } from './views/internal/InternalDashboard';
import { InternalDemosList } from './views/internal/InternalDemosList';
import { InternalScheduledDemos } from './views/internal/InternalScheduledDemos';
import { InternalCalendar } from './views/internal/InternalCalendar';
import { InternalTeam } from './views/internal/InternalTeam';
import { InternalSettings } from './views/internal/InternalSettings';

// Developer Console (Super Admin RBAC)
import { DeveloperProtectedRoute } from './components/developer/DeveloperProtectedRoute';
import { DeveloperLayout } from './components/developer/DeveloperLayout';
import { DeveloperLogin } from './views/developer/DeveloperLogin';
import { DeveloperDashboard } from './views/developer/DeveloperDashboard';
import { DepartmentManagement } from './views/developer/DepartmentManagement';
import { UserManagement } from './views/developer/UserManagement';
import { RolesPermissionsManagement } from './views/developer/RolesPermissionsManagement';
import { AuditTrailViewer } from './views/developer/AuditTrailViewer';

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <InternalAuthProvider>
          <Routes>
            {/* Public Customer Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/get-started" element={<GetStarted />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<CompanyRegistrationPage />} />
            <Route path="/invite/:token" element={<AcceptInvitationPage />} />
            <Route path="/pay/:token" element={<PublicInvoicePage />} />
            <Route path="/portal/invoice/:token" element={<PublicInvoicePage />} />

            {/* Internal Demo Management Portal Routes */}
            <Route path="/internal/login" element={<InternalLogin />} />
            <Route element={<InternalProtectedRoute />}>
              <Route element={<InternalLayout />}>
                <Route path="/internal/dashboard" element={<InternalDashboard />} />
                <Route path="/internal/demos" element={<InternalDemosList />} />
                <Route path="/internal/scheduled" element={<InternalScheduledDemos />} />
                <Route path="/internal/calendar" element={<InternalCalendar />} />
                <Route path="/internal/team" element={<InternalTeam />} />
                <Route path="/internal/settings" element={<InternalSettings />} />
                <Route path="/internal" element={<Navigate to="/internal/dashboard" replace />} />
              </Route>
            </Route>

            {/* Developer Console (Platform Super Admin RBAC) */}
            <Route path="/developer/login" element={<DeveloperLogin />} />
            <Route element={<DeveloperProtectedRoute />}>
              <Route element={<DeveloperLayout />}>
                <Route path="/developer/dashboard" element={<DeveloperDashboard />} />
                <Route path="/developer/departments" element={<DepartmentManagement />} />
                <Route path="/developer/users" element={<UserManagement />} />
                <Route path="/developer/roles" element={<RolesPermissionsManagement />} />
                <Route path="/developer/invitations" element={<UserManagement defaultTab="invitations" />} />
                <Route path="/developer/audit-logs" element={<AuditTrailViewer />} />
                <Route path="/developer" element={<Navigate to="/developer/dashboard" replace />} />
              </Route>
            </Route>

            {/* Authenticated Tenant Application Workspace Routes (Protected by AppShell) */}
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/bills" element={<BillsPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/banking" element={<BankingPage />} />
              <Route path="/items" element={<Items />} />
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
              <Route path="/security" element={<SecurityPage />} />
            </Route>

            {/* Catch-all redirects to public Landing Page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </InternalAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

