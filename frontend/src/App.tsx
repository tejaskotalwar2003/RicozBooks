import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { EntitiesPage } from './pages/EntitiesPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ChartOfAccounts } from './pages/ChartOfAccounts';
import { JournalEntries } from './pages/JournalEntries';
import { Approvals } from './pages/Approvals';
import { GeneralLedger } from './pages/GeneralLedger';
import { ModulePlaceholder } from './pages/ModulePlaceholder';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated Application Shell Routes */}
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="entities" element={<EntitiesPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            
            {/* Phase 2 Modules */}
            <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
            <Route path="journals" element={<JournalEntries />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="ledger" element={<GeneralLedger />} />
            <Route 
              path="ledger" 
              element={
                <ModulePlaceholder 
                  moduleName="General Ledger" 
                  description="Detailed account ledgers with running debit/credit balances and drill-down." 
                  phase={3} 
                />
              } 
            />
            <Route 
              path="reports" 
              element={
                <ModulePlaceholder 
                  moduleName="Financial Reports" 
                  description="Trial Balance, Profit & Loss, and Balance Sheet calculated strictly from posted transactions." 
                  phase={4} 
                />
              } 
            />
            <Route 
              path="close-manager" 
              element={
                <ModulePlaceholder 
                  moduleName="Close Manager" 
                  description="Period-end checklist, task assignments, and period locking." 
                  phase={5} 
                />
              } 
            />
            <Route 
              path="settings" 
              element={
                <ModulePlaceholder 
                  moduleName="Accounting Settings" 
                  description="Currencies, exchange rates, fiscal years, and role permissions." 
                  phase={6} 
                />
              } 
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

