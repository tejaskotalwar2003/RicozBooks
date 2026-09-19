import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';

export const AppShell: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-slate-300 border-t-[#781019] rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-600">Loading RicozBooks...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] relative">
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent Desktop / Drawer Mobile Sidebar */}
      <Sidebar 
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)} />
        
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
