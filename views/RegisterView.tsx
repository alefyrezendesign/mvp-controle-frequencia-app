
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Check, X, MessageSquare, FileText, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { AttendanceStatus, Member, Unit } from '../types';
import { getStatusColor, getNucleoColor } from '../utils';

interface RegisterViewProps {
  store: any;
  selectedUnit: Unit;
  selectedDate: string;
}

const RegisterView: React.FC<RegisterViewProps> = ({ store, selectedUnit, selectedDate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNucleo, setFilterNucleo] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showJustifyModal, setShowJustifyModal] = useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [justificationText, setJustificationText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const unitMembers = useMemo(() => 
    store.members.filter((m: Member) => m.unitId === selectedUnit.id && m.active),
  [store.members, selectedUnit.id]);

  const records = useMemo(() => 
    store.attendance.filter((r: any) => r.unitId === selectedUnit.id && r.date === selectedDate),
  [store.attendance, selectedUnit.id, selectedDate]);

  const filteredMembers = useMemo(() => {
    let result = unitMembers.map((m: Member) => {
      const record = records.find((r: any) => r.memberId === m.id);
      return { ...m, status: record?.status || AttendanceStatus.NOT_REGISTERED };
    });

    if (searchTerm) {
      result = result.filter((m: any) => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterNucleo !== 'all') {
      result = result.filter((m: any) => m.nucleoId === filterNucleo);
    }
    if (filterStatus !== 'all') {
      result = result.filter((m: any) => m.status === filterStatus);
    }

    return result.sort((a: any, b: any) => {
      const order = { 
        [AttendanceStatus.NOT_REGISTERED]: 0, 
        [AttendanceStatus.ABSENT]: 1, 
        [AttendanceStatus.JUSTIFIED]: 2, 
        [AttendanceStatus.PRESENT]: 3 
      };
      return order[a.status] - order[b.status] || a.name.localeCompare(b.name);
    });
  }, [unitMembers, records, searchTerm, filterNucleo, filterStatus]);

  const pendingCount = unitMembers.length - records.length;

  const handleStatusUpdate = (memberId: string, newStatus: AttendanceStatus, currentStatus: AttendanceStatus, text?: string) => {
    const finalStatus = currentStatus === newStatus ? AttendanceStatus.NOT_REGISTERED : newStatus;
    store.updateAttendance({
      memberId,
      date: selectedDate,
      unitId: selectedUnit.id,
      status: finalStatus,
      justificationText: finalStatus === AttendanceStatus.JUSTIFIED ? text : undefined
    });
  };

  const finalizeAttendance = () => {
    const pendingMembers = unitMembers.filter((m: Member) => !records.find((r: any) => r.memberId === m.id));
    const newRecords = pendingMembers.map((m: Member) => ({
      id: Math.random().toString(36).substr(2, 9),
      memberId: m.id,
      date: selectedDate,
      unitId: selectedUnit.id,
      status: AttendanceStatus.ABSENT,
      registeredAt: Date.now()
    }));
    store.batchUpdateAttendance(newRecords);
    setShowFinalizeModal(false);
    setShowToast(true);
  };

  return (
    <div className="flex flex-col gap-4 relative">
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-bold">Registro atualizado com sucesso!</span>
        </div>
      )}

      <div className="flex items-center justify-between py-2 border-b border-zinc-900/50">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          {filterStatus !== 'all' ? filterStatus : 'Lista de Chamada'}
        </h3>
        {pendingCount > 0 && (
          <button 
            onClick={() => setShowFinalizeModal(true)}
            className="flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 px-3 py-1 rounded-full text-[10px] font-black text-purple-400 uppercase tracking-tighter hover:bg-purple-600 hover:text-white transition-all"
          >
            Finalizar Culto <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="space-y-3 pb-32">
        {filteredMembers.map((member: any) => {
          const nucleo = store.nucleos.find((n: any) => n.id === member.nucleoId);
          const currentRecord = records.find((r: any) => r.memberId === member.id);
          
          return (
            <div key={member.id} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-3 transition-all hover:bg-zinc-900/60 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-100 text-base leading-tight mb-1">{member.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border ${getNucleoColor(nucleo?.color)}`}>
                      {nucleo?.name || 'Geral'}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border ${getStatusColor(member.status)} uppercase font-bold`}>
                      {member.status}
                    </span>
                  </div>
                </div>
                
                {member.status === AttendanceStatus.JUSTIFIED && (
                  <button 
                    onClick={() => {
                      setShowJustifyModal(member.id);
                      setJustificationText(currentRecord?.justificationText || '');
                    }}
                    className="p-2 hover:bg-zinc-800 rounded-xl transition-colors active:scale-90"
                  >
                    <FileText className="w-5 h-5 text-amber-500" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 mt-2">
                <ActionButton 
                  onClick={() => handleStatusUpdate(member.id, AttendanceStatus.PRESENT, member.status)}
                  active={member.status === AttendanceStatus.PRESENT}
                  variant="present"
                >
                  <Check className="w-4 h-4 mr-1" /> Presença
                </ActionButton>
                
                <ActionButton 
                  onClick={() => handleStatusUpdate(member.id, AttendanceStatus.ABSENT, member.status)}
                  active={member.status === AttendanceStatus.ABSENT}
                  variant="absent"
                >
                  <X className="w-4 h-4 mr-1" /> Falta
                </ActionButton>
                
                <ActionButton 
                  onClick={() => {
                    if (member.status === AttendanceStatus.JUSTIFIED) {
                      handleStatusUpdate(member.id, AttendanceStatus.JUSTIFIED, member.status);
                    } else {
                      setShowJustifyModal(member.id);
                      setJustificationText(currentRecord?.justificationText || '');
                    }
                  }}
                  active={member.status === AttendanceStatus.JUSTIFIED}
                  variant="justified"
                >
                  <MessageSquare className="w-4 h-4 mr-1" /> Justif.
                </ActionButton>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setIsSearchOpen(!isSearchOpen)}
        className={`fixed right-6 bottom-24 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isSearchOpen ? 'bg-zinc-800 rotate-90 text-zinc-100' : 'bg-purple-600 text-white shadow-purple-600/40 hover:scale-105 active:scale-95'
        }`}
      >
        {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
      </button>

      {/* Modal de Finalização */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Finalizar Culto?</h3>
            <p className="text-sm text-zinc-500 mb-8 font-medium">
              Existem <b>{pendingCount}</b> membros não registrados. Deseja marcar todos como <b>FALTA</b> agora?
            </p>
            <div className="space-y-3">
              <button 
                onClick={finalizeAttendance}
                className="w-full bg-purple-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-purple-600/20"
              >
                Sim, marcar faltas
              </button>
              <button 
                onClick={() => setShowFinalizeModal(false)}
                className="w-full bg-zinc-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-zinc-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Justification Modal */}
      {showJustifyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 w-full max-md rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-lg font-bold mb-1">Justificativa</h2>
            <p className="text-zinc-500 text-xs mb-4">Informar motivo</p>
            <textarea 
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm min-h-[120px] text-white outline-none focus:ring-1 focus:ring-purple-600"
              placeholder="Ex: Viagem, Saúde, Trabalho..."
              value={justificationText}
              onChange={(e) => setJustificationText(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowJustifyModal(null)} className="flex-1 py-3 text-zinc-500 font-bold">Cancelar</button>
              <button 
                onClick={() => {
                  store.updateAttendance({
                    memberId: showJustifyModal,
                    date: selectedDate,
                    unitId: selectedUnit.id,
                    status: AttendanceStatus.JUSTIFIED,
                    justificationText: justificationText
                  });
                  setShowJustifyModal(null);
                  setShowToast(true);
                }}
                className="flex-1 bg-purple-600 py-3 rounded-xl font-bold text-sm shadow-lg shadow-purple-600/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {isSearchOpen && (
        <div className="fixed inset-0 z-[45] bg-black/70 backdrop-blur-sm pt-40 px-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Filtrar Chamada</h3>
              <button onClick={() => setIsSearchOpen(false)} className="text-zinc-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-5">
              <input 
                autoFocus
                type="text" 
                placeholder="Nome do membro..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-sm text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <select 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-300"
                  value={filterNucleo}
                  onChange={(e) => setFilterNucleo(e.target.value)}
                >
                  <option value="all">Todos Núcleos</option>
                  {store.nucleos.map((n: any) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
                <select 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-300"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Todos Status</option>
                  {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={() => setIsSearchOpen(false)} className="w-full bg-purple-600 py-3 rounded-xl font-bold text-sm">Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionButton = ({ children, onClick, active, variant }: any) => {
  const styles = {
    present: active ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-emerald-400',
    absent: active ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-rose-400',
    justified: active ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-amber-400',
  };
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-[10px] font-black transition-all border border-transparent ${styles[variant as keyof typeof styles]}`}>
      {children}
    </button>
  );
};

export default RegisterView;
