
import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { 
  ClipboardList, 
  LayoutDashboard, 
  Users, 
  Settings 
} from 'lucide-react';

import { useDataStore } from './store';
import { AppTab, Unit } from './types';
import { UNITS } from './constants';
import { getValidServiceDates } from './utils';

// Components
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import RegisterView from './views/RegisterView';
import DashboardView from './views/DashboardView';
import MembersView from './views/MembersView';
import FollowUpView from './views/FollowUpView';
import TipsView from './views/TipsView';
import LoginView from './views/LoginView';
import SettingsView from './views/SettingsView';

const App: React.FC = () => {
  const store = useDataStore();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('church_auth') === 'true';
  });
  const [activeTab, setActiveTab] = useState<AppTab>('register');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(localStorage.getItem('church_last_unit') || UNITS[0].id);
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const initialDate = localStorage.getItem('church_last_date') || todayStr;
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  const selectedUnit = useMemo(() => 
    store.units.find(u => u.id === selectedUnitId) || store.units[0], 
  [selectedUnitId, store.units]);

  // Auth Logic usando a senha das configurações ou o padrão 123456
  const handleLogin = (password: string) => {
    const masterPassword = store.settings.accessPassword || '123456';
    if (password === masterPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('church_auth', 'true');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('church_auth');
  };

  useEffect(() => {
    if (store.loading || !isAuthenticated) return;
    const currentMonthStr = format(parseISO(selectedDate), 'yyyy-MM');
    const validDates = getValidServiceDates(selectedUnitId, currentMonthStr, selectedUnit.serviceDays);
    const isCurrentDateValid = validDates.some(d => format(d, 'yyyy-MM-dd') === selectedDate);
    if (!isCurrentDateValid && validDates.length > 0) {
      setSelectedDate(format(validDates[0], 'yyyy-MM-dd'));
    }
  }, [selectedUnitId, selectedUnit.serviceDays, store.loading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) localStorage.setItem('church_last_unit', selectedUnitId);
  }, [selectedUnitId, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) localStorage.setItem('church_last_date', selectedDate);
  }, [selectedDate, isAuthenticated]);

  if (store.loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-500 font-medium animate-pulse">Iniciando sistema...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (activeTab) {
      case 'register':
        return <RegisterView store={store} selectedUnit={selectedUnit} selectedDate={selectedDate} />;
      case 'dashboard':
        return <DashboardView store={store} selectedUnit={selectedUnit} />;
      case 'members':
        return <MembersView store={store} selectedUnit={selectedUnit} />;
      case 'followup':
        return <FollowUpView store={store} selectedUnit={selectedUnit} />;
      case 'tips':
        return <TipsView store={store} />;
      case 'settings':
        return <SettingsView store={store} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-gray-100 selection:bg-purple-600/30">
      <TopBar 
        selectedUnitId={selectedUnitId}
        setSelectedUnitId={setSelectedUnitId}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        store={store}
        selectedUnit={selectedUnit}
        activeTab={activeTab}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-y-auto pb-24 pt-4 px-4 md:px-8 max-w-5xl mx-auto w-full">
        {renderView()}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;
