import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { InternalAuthProvider } from './context/InternalAuthContext';
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
import { SecurityPage } from './pages/SecurityPage';
import { CompanyRegistrationPage } from './pages/CompanyRegistrationPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { CustomersPage } from './pages/CustomersPage';
import { BillsPage } from './pages/BillsPage';
import { VendorsPage } from './pages/VendorsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { BankingPage } from './pages/BankingPage';
import { InventoryPage } from './pages/InventoryPage';
import { Items } from './pages/Items';
import { GstCenterPage } from './pages/GstCenterPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { PublicInvoicePage } from './pages/PublicInvoicePage';

// Internal Demo Management Portal
import { InternalProtectedRoute } from './components/internal/InternalProtectedRoute';
import { InternalLayout } from './components/internal/InternalLayout';
import { InternalLogin } from './pages/internal/InternalLogin';
import { InternalDashboard } from './pages/internal/InternalDashboard';
import { InternalDemosList } from './pages/internal/InternalDemosList';
import { InternalScheduledDemos } from './pages/internal/InternalScheduledDemos';
import { InternalCalendar } from './pages/internal/InternalCalendar';
import { InternalTeam } from './pages/internal/InternalTeam';
import { InternalSettings } from './pages/internal/InternalSettings';

// Developer Console (Super Admin RBAC)
import { DeveloperProtectedRoute } from './components/developer/DeveloperProtectedRoute';
import { DeveloperLayout } from './components/developer/DeveloperLayout';
import { DeveloperLogin } from './pages/developer/DeveloperLogin';
import { DeveloperDashboard } from './pages/developer/DeveloperDashboard';
import { DepartmentManagement } from './pages/developer/DepartmentManagement';
import { UserManagement } from './pages/developer/UserManagement';
import { RolesPermissionsManagement } from './pages/developer/RolesPermissionsManagement';
import { AuditTrailViewer } from './pages/developer/AuditTrailViewer';

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
