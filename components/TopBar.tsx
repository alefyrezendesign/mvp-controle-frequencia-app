
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, LogOut, X, AlertTriangle } from 'lucide-react';
import { Unit, AttendanceStatus, AppTab } from '../types';
import { format, parseISO, addMonths, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getValidServiceDates } from '../utils';

interface TopBarProps {
  selectedUnitId: string;
  setSelectedUnitId: (id: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  store: any;
  selectedUnit: Unit;
  activeTab: AppTab;
  onLogout: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  selectedUnitId, 
  setSelectedUnitId, 
  selectedDate, 
  setSelectedDate,
  store,
  selectedUnit,
  activeTab,
  onLogout
}) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const currentMonthDate = parseISO(selectedDate);
  const monthDisplay = format(currentMonthDate, 'MMMM yyyy', { locale: ptBR });

  const activeUnitMembers = useMemo(() => 
    store.members.filter((m: any) => m.unitId === selectedUnitId && m.active),
    [store.members, selectedUnitId]
  );

  const validDates = useMemo(() => {
    const monthStr = format(currentMonthDate, 'yyyy-MM');
    return getValidServiceDates(selectedUnitId, monthStr, selectedUnit.serviceDays);
  }, [selectedUnitId, currentMonthDate, selectedUnit.serviceDays]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const nextMonth = direction === 'next' ? addMonths(currentMonthDate, 1) : subMonths(currentMonthDate, 1);
    const monthStr = format(nextMonth, 'yyyy-MM');
    const datesInNextMonth = getValidServiceDates(selectedUnitId, monthStr, selectedUnit.serviceDays);
    
    if (datesInNextMonth.length > 0) {
      setSelectedDate(format(datesInNextMonth[0], 'yyyy-MM-dd'));
    } else {
      setSelectedDate(format(startOfMonth(nextMonth), 'yyyy-MM-dd'));
    }
  };

  const currentAttendance = useMemo(() => {
    const records = store.attendance.filter((r: any) => r.unitId === selectedUnitId && r.date === selectedDate);
    
    const present = records.filter((r: any) => r.status === AttendanceStatus.PRESENT).length;
    const absent = records.filter((r: any) => r.status === AttendanceStatus.ABSENT).length;
    const justified = records.filter((r: any) => r.status === AttendanceStatus.JUSTIFIED).length;
    const total = activeUnitMembers.length;
    const registered = records.length;
    const notRegistered = total - registered;
    const presenceRate = total > 0 ? (present / total) * 100 : 0;

    return { present, absent, justified, notRegistered, presenceRate };
  }, [store.attendance, activeUnitMembers, selectedUnitId, selectedDate]);

  const isDateCompleted = (dateStr: string) => {
    const recordsCount = store.attendance.filter((r: any) => r.unitId === selectedUnitId && r.date === dateStr).length;
    return activeUnitMembers.length > 0 && recordsCount >= activeUnitMembers.length;
  };

  return (
    <header className="sticky top-0 z-40 bg-black border-b border-zinc-900 pt-4 pb-2">
      <div className="max-w-5xl mx-auto flex flex-col gap-4 items-center">
        
        <div className="flex items-center gap-3 justify-between w-full px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 border border-zinc-700 overflow-hidden">
              <div className="bg-purple-600 text-white font-black text-[10px] p-2 rounded">MVP</div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-black text-white leading-tight">Gestão de Frequência</h1>
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Visão e Propósito</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-rose-500 transition-colors active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex bg-zinc-900/80 p-1 rounded-xl w-fit border border-zinc-800/50 mx-auto">
          {store.units.map((unit: Unit) => (
            <button
              key={unit.id}
              onClick={() => setSelectedUnitId(unit.id)}
              className={`px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-tighter transition-all ${
                selectedUnitId === unit.id 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {unit.name}
            </button>
          ))}
        </div>

        {activeTab === 'register' && (
          <>
            <div className="flex items-center justify-between w-full px-4 mt-1">
              <button onClick={() => handleMonthChange('prev')} className="p-1.5 hover:bg-zinc-900 rounded-full text-zinc-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 capitalize">
                {monthDisplay}
              </h2>
              <button onClick={() => handleMonthChange('next')} className="p-1.5 hover:bg-zinc-900 rounded-full text-zinc-600 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-2 w-full px-4 py-1">
              {validDates.map(date => {
                const dStr = format(date, 'yyyy-MM-dd');
                const isActive = dStr === selectedDate;
                const completed = isDateCompleted(dStr);
                const dayOfWeek = format(date, 'EEE', { locale: ptBR }).toUpperCase().replace('.', '').substring(0, 3);
                const dayOfMonth = format(date, 'dd');

                return (
                  <button
                    key={dStr}
                    onClick={() => setSelectedDate(dStr)}
                    className={`relative flex flex-col items-center justify-center w-[calc(20%-8px)] min-w-[50px] aspect-square rounded-xl transition-all duration-300 border ${
                      isActive 
                        ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30 scale-105 z-10' 
                        : completed
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                          : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    {completed && !isActive && (
                      <CheckCircle2 className="absolute -top-1 -right-1 w-3.5 h-3.5 text-emerald-500 fill-black" />
                    )}
                    {completed && isActive && (
                      <CheckCircle2 className="absolute -top-1 -right-1 w-3.5 h-3.5 text-white fill-purple-600" />
                    )}
                    <span className={`text-[8px] font-black tracking-widest mb-0.5 ${isActive ? 'text-purple-100' : completed ? 'text-emerald-500/70' : 'text-zinc-600'}`}>
                      {dayOfWeek}
                    </span>
                    <span className="text-sm font-black leading-none">
                      {dayOfMonth}
                    </span>
                  </button>
                );
              })}
              {validDates.length === 0 && (
                <div className="w-full text-center py-2 text-zinc-700 text-[10px] font-bold uppercase tracking-widest italic">
                  Sem cultos neste mês
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1.5 pb-2 w-full px-4 mt-1">
              <StatCard label="Pres." value={currentAttendance.present} color="text-emerald-400" />
              <StatCard label="Faltas" value={currentAttendance.absent} color="text-rose-400" />
              <StatCard label="Just." value={currentAttendance.justified} color="text-amber-400" />
              <StatCard label="Pend." value={currentAttendance.notRegistered} color="text-zinc-500" />
              <StatCard label="Freq." value={`${currentAttendance.presenceRate.toFixed(0)}%`} color="text-purple-400" />
            </div>
          </>
        )}
      </div>

      {/* Custom Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            
            <div className="text-center mb-8">
              <h3 className="text-xl font-black text-white tracking-tight mb-2">Sair do Aplicativo?</h3>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                Você precisará digitar a senha de acesso novamente para entrar.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout();
                }}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20 transition-all active:scale-[0.98]"
              >
                Sim, Sair agora
              </button>
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

const StatCard = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
  <div className="bg-zinc-900/50 rounded-lg p-1.5 flex flex-col items-center justify-center border border-zinc-800/30">
    <span className={`text-[11px] font-black ${color}`}>{value}</span>
    <span className="text-[8px] text-zinc-600 uppercase tracking-tighter font-bold">{label}</span>
  </div>
);

export default TopBar;
