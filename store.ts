
import { useState, useEffect, useCallback } from 'react';
import { Member, AttendanceRecord, CabinetFollowUp, AppSettings, Unit, Nucleo, AttendanceStatus } from './types';
import { MOCK_MEMBERS, UNITS, NUCLEOS, INITIAL_SETTINGS } from './constants';

const LS_KEYS = {
  MEMBERS: 'church_members',
  ATTENDANCE: 'church_attendance',
  CABINET: 'church_cabinet',
  SETTINGS: 'church_settings',
  UNITS: 'church_units',
  NUCLEOS: 'church_nucleos',
  LAST_UNIT: 'church_last_unit',
  LAST_DATE: 'church_last_date'
};

export function useDataStore() {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [cabinet, setCabinet] = useState<CabinetFollowUp[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [units, setUnits] = useState<Unit[]>(UNITS);
  const [nucleos, setNucleos] = useState<Nucleo[]>(NUCLEOS);
  const [loading, setLoading] = useState(true);

  // Persistence
  useEffect(() => {
    const savedMembers = localStorage.getItem(LS_KEYS.MEMBERS);
    const savedAttendance = localStorage.getItem(LS_KEYS.ATTENDANCE);
    const savedCabinet = localStorage.getItem(LS_KEYS.CABINET);
    const savedSettings = localStorage.getItem(LS_KEYS.SETTINGS);
    const savedUnits = localStorage.getItem(LS_KEYS.UNITS);
    const savedNucleos = localStorage.getItem(LS_KEYS.NUCLEOS);

    if (savedMembers) setMembers(JSON.parse(savedMembers));
    else setMembers(MOCK_MEMBERS);

    if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
    if (savedCabinet) setCabinet(JSON.parse(savedCabinet));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedUnits) setUnits(JSON.parse(savedUnits));
    if (savedNucleos) setNucleos(JSON.parse(savedNucleos));

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(LS_KEYS.MEMBERS, JSON.stringify(members));
      localStorage.setItem(LS_KEYS.ATTENDANCE, JSON.stringify(attendance));
      localStorage.setItem(LS_KEYS.CABINET, JSON.stringify(cabinet));
      localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
      localStorage.setItem(LS_KEYS.UNITS, JSON.stringify(units));
      localStorage.setItem(LS_KEYS.NUCLEOS, JSON.stringify(nucleos));
    }
  }, [members, attendance, cabinet, settings, units, nucleos, loading]);

  const updateAttendance = (record: Omit<AttendanceRecord, 'id' | 'registeredAt'>) => {
    setAttendance(prev => {
      const filtered = prev.filter(r => !(r.memberId === record.memberId && r.date === record.date));
      if (record.status === AttendanceStatus.NOT_REGISTERED) {
        return filtered;
      }
      return [...filtered, { 
        ...record, 
        id: Math.random().toString(36).substr(2, 9),
        registeredAt: Date.now() 
      }];
    });
  };

  const batchUpdateAttendance = (records: AttendanceRecord[]) => {
    setAttendance(prev => {
      const keysToRemove = new Set(records.map(r => `${r.memberId}-${r.date}`));
      const filtered = prev.filter(r => !keysToRemove.has(`${r.memberId}-${r.date}`));
      return [...filtered, ...records];
    });
  };

  const updateCabinetStatus = (memberId: string, period: string, status: CabinetFollowUp['status']) => {
    setCabinet(prev => {
      const filtered = prev.filter(c => !(c.memberId === memberId && c.period === period));
      return [...filtered, { memberId, period, status, lastUpdate: Date.now() }];
    });
  };

  const saveMember = (member: Member) => {
    setMembers(prev => {
      const exists = prev.find(m => m.id === member.id);
      if (exists) return prev.map(m => m.id === member.id ? member : m);
      return [...prev, member];
    });
  };

  const batchSaveMembers = (newMembers: Member[]) => {
    setMembers(prev => {
      // Evitar duplicatas por nome (opcional, mas seguro)
      const existingNames = new Set(prev.map(m => m.name.toLowerCase()));
      const uniqueNew = newMembers.filter(m => !existingNames.has(m.name.toLowerCase()));
      return [...prev, ...uniqueNew];
    });
  };

  return {
    members, attendance, cabinet, settings, units, nucleos, loading,
    updateAttendance, batchUpdateAttendance, updateCabinetStatus, saveMember, batchSaveMembers, setSettings
  };
}
