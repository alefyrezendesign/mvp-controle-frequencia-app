
import React, { useMemo, useState } from 'react';
import { MessageCircle, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { AttendanceStatus, CabinetStatus, Unit, Member, FrequencyCategory } from '../types';
import { calculateAttendance, getValidServiceDates, getNucleoColor, getAbsenceCategory } from '../utils';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FollowUpViewProps {
  store: any;
  selectedUnit: Unit;
}

const FollowUpView: React.FC<FollowUpViewProps> = ({ store, selectedUnit }) => {
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  const currentMonthStr = format(selectedMonthDate, 'yyyy-MM');

  const allFollowUps = useMemo(() => {
    const validDates = getValidServiceDates(selectedUnit.id, currentMonthStr, selectedUnit.serviceDays);
    const totalServices = validDates.length;

    return store.members
      .filter((m: Member) => m.unitId === selectedUnit.id && m.active)
      .map((m: Member) => {
        const records = store.attendance.filter((r: any) => 
          r.memberId === m.id && r.date.startsWith(currentMonthStr)
        );
        const stats = calculateAttendance(records, totalServices, store.settings);
        const cabinetInfo = store.cabinet.find((c: any) => c.memberId === m.id && c.period === currentMonthStr);
        const catInfo = getAbsenceCategory(stats.absences);

        return { 
          ...m, 
          ...stats, 
          category: catInfo, 
          cabinetStatus: cabinetInfo?.status || CabinetStatus.PENDING 
        };
      })
      // Filtrar membros com 3 faltas ou mais (Categorias Baixa e Crítica)
      .filter((m: any) => m.absences >= 3);
  }, [store.members, store.attendance, store.cabinet, store.settings, selectedUnit, currentMonthStr]);

  const activeFollowUps = useMemo(() => 
    allFollowUps.filter(m => m.cabinetStatus !== CabinetStatus.DONE)
      .sort((a, b) => b.absences - a.absences),
  [allFollowUps]);

  const resolvedFollowUps = useMemo(() => 
    allFollowUps.filter(m => m.cabinetStatus === CabinetStatus.DONE)
      .sort((a, b) => b.absences - a.absences),
  [allFollowUps]);

  const handleInformPastor = (member: any) => {
    const mesFormatado = format(selectedMonthDate, 'MMMM/yyyy', { locale: ptBR });
    const text = `Olá, pastor. Frequência do(a) ${member.name} (Unidade: ${selectedUnit.name}) em ${mesFormatado}: Presenças ${member.presences}, Faltas ${member.absences}, Justificadas ${member.justifications}, Frequência ${member.percent.toFixed(0)}%. Categoria: ${member.category.label.toUpperCase()}. Status: ${member.cabinetStatus}. Sugiro agendar um gabinete para acompanhamento.`;
    const url = `https://wa.me/${selectedUnit.pastorPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Acompanhamento Pastoral</h2>
        <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-purple-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">
          {selectedUnit.name}
        </span>
      </div>

      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-sm">
        <button onClick={() => setSelectedMonthDate(subMonths(selectedMonthDate, 1))} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <span className="text-base font-bold text-white capitalize">{format(selectedMonthDate, 'MMMM yyyy', { locale: ptBR })}</span>
        </div>
        <button onClick={() => setSelectedMonthDate(addMonths(selectedMonthDate, 1))} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 px-2">
          <Clock className="w-3 h-3" /> Demandas Ativas ({activeFollowUps.length})
        </h3>
        {activeFollowUps.map((member: any) => (
          <FollowUpCard 
            key={member.id} 
            member={member} 
            store={store} 
            currentMonthStr={currentMonthStr} 
            onInform={handleInformPastor}
          />
        ))}
        {activeFollowUps.length === 0 && (
          <div className="py-12 text-center text-zinc-600 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
            Nenhuma demanda pendente
          </div>
        )}
      </div>

      {resolvedFollowUps.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 px-2">
            <CheckCircle2 className="w-3 h-3" /> Resolvidos ({resolvedFollowUps.length})
          </h3>
          {resolvedFollowUps.map((member: any) => (
            <FollowUpCard 
              key={member.id} 
              member={member} 
              store={store} 
              currentMonthStr={currentMonthStr} 
              onInform={handleInformPastor}
              resolved
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FollowUpCard = ({ member, store, currentMonthStr, onInform, resolved }: any) => {
  const nucleo = store.nucleos.find((n: any) => n.id === member.nucleoId);
  const statusStyles = member.cabinetStatus === CabinetStatus.DONE 
    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
    : member.cabinetStatus === CabinetStatus.SCHEDULED 
      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
      : 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  
  return (
    <div className={`border rounded-2xl overflow-hidden shadow-xl ${resolved ? 'bg-zinc-900/40 border-emerald-900/20' : 'bg-zinc-900 border-zinc-800'}`}>
      <div className="p-4 flex justify-between items-start border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-xs text-zinc-500">{member.name.substring(0, 2).toUpperCase()}</div>
          <div>
            <h3 className="font-bold text-zinc-100 leading-tight mb-1">{member.name}</h3>
            <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold border ${getNucleoColor(nucleo?.color)}`}>{nucleo?.name || 'Geral'}</span>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${member.category.color} ${member.category.bg} border border-current opacity-70`}>
          {member.category.label.split(' ')[1]}
        </div>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Faltas no Mês</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-rose-500">{member.absences}</span>
            <span className="text-[10px] text-zinc-600 font-bold uppercase">faltas</span>
          </div>
        </div>
        <div>
          <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Status do Gabinete</p>
          <select 
            className={`w-full border rounded-xl text-[10px] py-2 px-2 font-bold outline-none appearance-none cursor-pointer ${statusStyles}`}
            value={member.cabinetStatus}
            onChange={(e) => store.updateCabinetStatus(member.id, currentMonthStr, e.target.value as CabinetStatus)}
          >
            {Object.values(CabinetStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button onClick={() => onInform(member)} className="w-full rounded-xl py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-600/20 transition-all active:scale-[0.98]">
          <MessageCircle className="w-4 h-4" /> Informar Pastor
        </button>
      </div>
    </div>
  );
};

export default FollowUpView;
