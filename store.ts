
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Member, AttendanceRecord, CabinetFollowUp, AppSettings, Unit, Nucleo, AttendanceStatus } from './types';
import { MOCK_MEMBERS, UNITS, NUCLEOS, INITIAL_SETTINGS } from './constants';

// Estas variáveis devem ser configuradas no Vercel (Settings -> Environment Variables)
// Fix: Access environment variables through process.env instead of import.meta.env to resolve 'env' property missing error on ImportMeta
const SUPABASE_URL = (process.env as any).VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (process.env as any).VITE_SUPABASE_ANON_KEY || '';

// Inicializa o cliente apenas se as chaves existirem
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export function useDataStore() {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [cabinet, setCabinet] = useState<CabinetFollowUp[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [units] = useState<Unit[]>(UNITS);
  const [nucleos] = useState<Nucleo[]>(NUCLEOS);
  const [loading, setLoading] = useState(true);

  // Carregamento Inicial (Banco de Dados ou LocalStorage como backup)
  useEffect(() => {
    async function loadInitialData() {
      if (supabase) {
        try {
          const [
            { data: dbMembers },
            { data: dbAttendance },
            { data: dbCabinet },
            { data: dbSettings }
          ] = await Promise.all([
            supabase.from('members').select('*'),
            supabase.from('attendance').select('*'),
            supabase.from('cabinet').select('*'),
            supabase.from('settings').select('data').single()
          ]);

          if (dbMembers) setMembers(dbMembers);
          if (dbAttendance) setAttendance(dbAttendance);
          if (dbCabinet) setCabinet(dbCabinet);
          if (dbSettings?.data) setSettings(dbSettings.data);
        } catch (error) {
          console.error('Erro ao carregar do Supabase:', error);
          loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }
      setLoading(false);
    }

    function loadFromLocalStorage() {
      const savedMembers = localStorage.getItem('church_members');
      const savedAttendance = localStorage.getItem('church_attendance');
      const savedSettings = localStorage.getItem('church_settings');
      
      if (savedMembers) setMembers(JSON.parse(savedMembers));
      else setMembers(MOCK_MEMBERS);
      
      if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
      if (savedSettings) setSettings(JSON.parse(savedSettings));
    }

    loadInitialData();
  }, []);

  // Update Methods (Salvando no Banco)
  const updateAttendance = async (record: Omit<AttendanceRecord, 'id' | 'registeredAt'>) => {
    const newRecord = { 
      ...record, 
      id: Math.random().toString(36).substr(2, 9),
      registeredAt: Date.now() 
    };

    setAttendance(prev => {
      const filtered = prev.filter(r => !(r.memberId === record.memberId && r.date === record.date));
      return record.status === AttendanceStatus.NOT_REGISTERED ? filtered : [...filtered, newRecord];
    });

    if (supabase) {
      // Deleta anterior e insere novo no banco
      await supabase.from('attendance').delete().match({ memberId: record.memberId, date: record.date });
      if (record.status !== AttendanceStatus.NOT_REGISTERED) {
        await supabase.from('attendance').insert(newRecord);
      }
    } else {
      localStorage.setItem('church_attendance', JSON.stringify(attendance));
    }
  };

  const batchUpdateAttendance = async (records: AttendanceRecord[]) => {
    setAttendance(prev => {
      const keysToRemove = new Set(records.map(r => `${r.memberId}-${r.date}`));
      const filtered = prev.filter(r => !keysToRemove.has(`${r.memberId}-${r.date}`));
      return [...filtered, ...records];
    });

    if (supabase) {
      for (const r of records) {
        await supabase.from('attendance').upsert(r);
      }
    }
  };

  const updateCabinetStatus = async (memberId: string, period: string, status: CabinetFollowUp['status']) => {
    const newItem = { memberId, period, status, lastUpdate: Date.now() };
    setCabinet(prev => {
      const filtered = prev.filter(c => !(c.memberId === memberId && c.period === period));
      return [...filtered, newItem];
    });

    if (supabase) {
      await supabase.from('cabinet').upsert(newItem);
    }
  };

  const saveMember = async (member: Member) => {
    setMembers(prev => {
      const exists = prev.find(m => m.id === member.id);
      return exists ? prev.map(m => m.id === member.id ? member : m) : [...prev, member];
    });

    if (supabase) {
      await supabase.from('members').upsert(member);
    }
  };

  const batchSaveMembers = async (newMembers: Member[]) => {
    setMembers(prev => [...prev, ...newMembers]);
    if (supabase) {
      await supabase.from('members').insert(newMembers);
    }
  };

  const updateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (supabase) {
      await supabase.from('settings').upsert({ id: 1, data: newSettings });
    } else {
      localStorage.setItem('church_settings', JSON.stringify(newSettings));
    }
  };

  return {
    members, attendance, cabinet, settings, units, nucleos, loading,
    updateAttendance, batchUpdateAttendance, updateCabinetStatus, saveMember, batchSaveMembers, setSettings: updateSettings
  };
}
