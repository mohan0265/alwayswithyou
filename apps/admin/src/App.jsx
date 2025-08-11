import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { Heart, Settings, BarChart3, MessageSquare, Image, Shield, Database } from 'lucide-react';
import { UserIcon } from 'lucide-react';

// Components
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Organizations } from './pages/Organizations';
import { Users } from './pages/Users';
import { Pairings } from './pages/Pairings';
import { Analytics } from './pages/Analytics';
import { Messages } from './pages/Messages';
import { Memories } from './pages/Memories';
import { Settings as SettingsPage } from './pages/Settings';
import { Login } from './pages/Login';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useApi } from './hooks/useApi';

import './App.css';

// Navigation items
const navigationItems = [
  {
    title: 'Dashboard',
    icon: BarChart3,
    path: '/dashboard',
    description: 'Overview and key metrics'
  },
  {
    title: 'Organizations',
    icon: Shield,
    path: '/organizations',
    description: 'Manage university organizations'
  },
  {
    title: 'Users',
    icon: UserIcon,
    path: '/users',
    description: 'Students, parents, and admins'
  },
  {
    title: 'Pairings',
    icon: Heart,
    path: '/pairings',
    description: 'Student-parent connections'
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    path: '/analytics',
    description: 'Usage and engagement data'
  },
  {
    title: 'Messages',
    icon: MessageSquare,
    path: '/messages',
    description: 'Chat moderation and reports'
  },
  {
    title: 'Memories',
    icon: Image,
    path: '/memories',
    description: 'Photo sharing and approval'
  },
  {
    title: 'Settings',
    icon: Settings,
    path: '/settings',
    description: 'System configuration'
  }
];

function AppContent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const { isConnected } = useApi();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        items={navigationItems}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onLogout={logout}
          isConnected={isConnected}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/users" element={<Users />} />
            <Route path="/pairings" element={<Pairings />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/memories" element={<Memories />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <Router>
        <AppContent />
        <Toaster position="top-right" />
      </Router>
    </ThemeProvider>
  );
}

export default App;

