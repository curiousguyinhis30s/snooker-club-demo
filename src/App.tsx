import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import MobileHeader from './components/MobileHeader';
import MobileSettingsMenu from './components/MobileSettingsMenu';
import DataLossWarning, { saveDataFingerprint } from './components/DataLossWarning';
import TablesView from './pages/TablesView';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import BillsHistory from './pages/BillsHistory';
import TableManagement from './pages/TableManagement';
import FnBManagement from './pages/FnBManagement';
import AdminDashboard from './pages/AdminDashboard';
import BackupSync from './pages/BackupSync';
import AppSettings from './pages/AppSettings';
import UserManagement from './pages/UserManagement';
import Reservations from './pages/Reservations';
import RolePermissions from './pages/RolePermissions';
import ActivityManagement from './pages/ActivityManagement';
import Login from './pages/Login';
import OwnerSetup from './pages/OwnerSetup';
import { store } from './lib/store';
import { hasOwner, getCurrentUser, logout } from './lib/auth';
import { useGlobalShortcuts } from './hooks/useKeyboardShortcuts';
import type { Table, User } from './types';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [showSetup, setShowSetup] = useState(false); // Always show login first - SuperAdmin creates owner
  const [settings, setSettings] = useState(store.getSettings());
  const [currentView, setCurrentView] = useState<string>(() => {
    // Default to first enabled activity
    const enabledActivities = settings.activities?.filter(a => a.enabled) || [];
    return enabledActivities.length > 0 ? `bookings-${enabledActivities[0].id}` : 'customers';
  });
  const [tables, setTables] = useState<Table[]>([]);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  // Enable global keyboard shortcuts
  useGlobalShortcuts();

  useEffect(() => {
    setTables(store.getTables());
  }, []);

  const handleStartSession = (tableId: number, name: string, phone?: string) => {
    const updatedTables = store.startSession(tableId, name, phone);
    setTables(updatedTables);
  };

  const handlePauseSession = (tableId: number) => {
    const updatedTables = store.pauseSession(tableId);
    setTables(updatedTables);
  };

  const handleResumeSession = (tableId: number) => {
    const updatedTables = store.resumeSession(tableId);
    setTables(updatedTables);
  };

  const handleStopSession = (tableId: number) => {
    const { tables: updatedTables } = store.endSession(tableId);
    setTables(updatedTables);
  };

  const handleAddFood = (tableId: number, menuItemId: string, quantity: number) => {
    const updatedTables = store.addFoodItem(tableId, menuItemId, quantity);
    setTables(updatedTables);
  };

  const handleAddBundle = (tableId: number, bundleId: string, quantity: number) => {
    const updatedTables = store.addBundle(tableId, bundleId, quantity);
    setTables(updatedTables);
  };

  const handleRemoveFood = (tableId: number, itemId: string) => {
    const updatedTables = store.removeFoodItem(tableId, itemId);
    setTables(updatedTables);
  };

  const handleSaveMenuItems = (menuItems: typeof settings.menuItems) => {
    const updatedSettings = { ...settings, menuItems };
    store.saveSettings(updatedSettings);
    setSettings(updatedSettings);
  };

  const handleSaveBundles = (bundles: typeof settings.bundles) => {
    const updatedSettings = { ...settings, bundles };
    store.saveSettings(updatedSettings);
    setSettings(updatedSettings);
  };

  const handleSaveSettings = (newSettings: typeof settings) => {
    store.saveSettings(newSettings);
    setSettings(newSettings);
    setTables(store.getTables());
  };

  const handleLogin = () => {
    setCurrentUser(getCurrentUser());
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    setCurrentUser(getCurrentUser());
    // Save fingerprint after owner setup
    saveDataFingerprint();
  };

  // Navigate to backup page for data restoration
  const handleNavigateToBackup = () => {
    setCurrentView('settings-backup');
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
  };

  // Show owner setup if no owner exists
  if (showSetup) {
    return <OwnerSetup onComplete={handleSetupComplete} />;
  }

  // Show login if not authenticated
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    // Handle dynamic activity routes (bookings-snooker, bookings-pool, etc.)
    if (currentView.startsWith('bookings-')) {
      const activityId = currentView.replace('bookings-', '');
      return (
        <TablesView
          tables={tables}
          menuItems={settings.menuItems}
          bundles={settings.bundles}
          activityId={activityId}
          userRole={currentUser.role}
          onStartSession={handleStartSession}
          onPauseSession={handlePauseSession}
          onResumeSession={handleResumeSession}
          onStopSession={handleStopSession}
          onAddFood={handleAddFood}
          onAddBundle={handleAddBundle}
          onRemoveFood={handleRemoveFood}
          onConfirmPayment={handleStopSession}
        />
      );
    }

    switch (currentView) {
      case 'reservations':
        return <Reservations settings={settings} />;
      case 'customers':
        return <Customers />;
      case 'expenses':
        return <Expenses />;
      case 'bills-history':
        return <BillsHistory />;
      case 'settings-users':
        return <UserManagement currentUser={currentUser} />;
      case 'settings-fnb':
        return (
          <FnBManagement
            menuItems={settings.menuItems}
            bundles={settings.bundles}
            onSaveMenuItems={handleSaveMenuItems}
            onSaveBundles={handleSaveBundles}
            userRole={currentUser.role}
          />
        );
      case 'settings-analytics':
        return <AdminDashboard tables={tables} currency={settings.currency} />;
      case 'settings-permissions':
        return currentUser.role === 'owner' || currentUser.role === 'superadmin' ? (
          <RolePermissions settings={settings} onSave={handleSaveSettings} />
        ) : null;
      case 'settings-activities':
        return currentUser.role === 'owner' || currentUser.role === 'superadmin' ? (
          <ActivityManagement settings={settings} onSave={handleSaveSettings} />
        ) : null;
      case 'settings-backup':
        return currentUser.role === 'owner' || currentUser.role === 'superadmin' ? <BackupSync settings={settings} /> : null;
      case 'settings-app':
        return <AppSettings settings={settings} onSave={handleSaveSettings} userRole={currentUser.role} />;
      default:
        return null;
    }
  };

  // Handle mobile view change with settings menu logic
  const handleMobileViewChange = (view: string) => {
    if (view === 'settings-app' && !showMobileSettings) {
      setShowMobileSettings(true);
    } else {
      setCurrentView(view);
      setShowMobileSettings(false);
    }
  };

  // Mobile settings menu (full screen on mobile)
  if (showMobileSettings) {
    return (
      <div className="lg:hidden">
        <MobileSettingsMenu
          currentUser={currentUser}
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            setShowMobileSettings(false);
          }}
          onLogout={handleLogout}
          onBack={() => setShowMobileSettings(false)}
        />
      </div>
    );
  }

  return (
    <>
      {/* Data Loss Warning - shows if localStorage was cleared */}
      <DataLossWarning onRestoreFromBackup={handleNavigateToBackup} />

      {/* Desktop Layout - unchanged */}
      <div className="hidden lg:flex h-screen bg-slate-50">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          clubName={settings.clubName}
          settings={settings}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto">
          {renderView()}
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col h-screen bg-slate-50">
        <MobileHeader
          clubName={settings.clubName}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto pb-nav-safe">
          {renderView()}
        </main>
        <BottomNav
          currentView={currentView}
          onViewChange={handleMobileViewChange}
          settings={settings}
          currentUser={currentUser}
        />
      </div>
    </>
  );
}

export default App;
