
import React, { useState } from 'react';
import { UserStats } from '../types';
import { Button } from './Button';

interface GamificationHeaderProps {
  stats: UserStats;
  onOpenStore: () => void;
  onOpenCalendar: () => void;
  onOpenReminders: () => void;
}

export const GamificationHeader: React.FC<GamificationHeaderProps> = ({ stats, onOpenStore, onOpenCalendar, onOpenReminders }) => {
  return (
    <div className="flex items-center gap-2">
      {/* Racha */}
      <button 
        onClick={onOpenCalendar}
        className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/30 px-3 py-1.5 rounded-2xl border border-orange-100 dark:border-orange-900/50 transition-all hover:scale-105 group relative"
      >
        <span className="text-xl">🔥</span>
        <span className="font-black text-orange-600 dark:text-orange-400">{stats.streak}</span>
      </button>

      {/* Recordatorios */}
      <button 
        onClick={onOpenReminders}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition-all hover:scale-105 ${stats.reminderTime ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
      >
        <span className="text-xl">{stats.reminderTime ? '🔔' : '🔕'}</span>
      </button>

      {/* Esmeraldas */}
      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 transition-all hover:scale-105 cursor-pointer" onClick={onOpenStore}>
        <span className="text-xl">💎</span>
        <span className="font-black text-emerald-600 dark:text-emerald-400">{stats.emeralds}</span>
      </div>

      {/* Protectores */}
      <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 transition-all hover:scale-105 cursor-pointer" onClick={onOpenStore}>
        <span className="text-xl">🛡️</span>
        <span className="font-black text-indigo-600 dark:text-indigo-400">{stats.protectors}</span>
      </div>
    </div>
  );
};

export const StreakCalendar: React.FC<{ stats: UserStats, onClose: () => void }> = ({ stats, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-orange-500 p-8 text-center text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="text-5xl mb-4">📜</div>
          <h2 className="text-2xl font-black uppercase tracking-widest">Almanaque de Vida</h2>
          <p className="text-orange-100 text-sm mt-2 opacity-80">Tu constancia en la Palabra</p>
        </div>

        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">◀</button>
            <h3 className="font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">{monthNames[month]} {year}</h3>
            <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">▶</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
              <span key={d} className="text-[10px] font-black text-slate-400 uppercase">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;
              const hasStudied = stats.studyHistory.includes(dateStr);
              
              return (
                <div 
                  key={day} 
                  className={`aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all relative ${
                    hasStudied 
                    ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800' 
                    : isToday 
                      ? 'border-2 border-indigo-600 text-indigo-600' 
                      : 'text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {day}
                  {hasStudied && <span className="absolute -top-1 -right-1 text-[8px]">🔥</span>}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex gap-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800 rounded-sm"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Estudiado</span>
            </div>
            <div className="flex items-center gap-2 text-orange-600">
              <span className="text-xl">🔥</span>
              <span className="text-[10px] font-black uppercase">Racha de {stats.streak} días</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReminderSettings: React.FC<{ stats: UserStats, onClose: () => void, onSetReminder: (time: string | null) => void }> = ({ stats, onClose, onSetReminder }) => {
  const [time, setTime] = useState(stats.reminderTime || "08:00");
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);

  const requestPermission = async () => {
    const res = await Notification.requestPermission();
    setPermission(res);
  };

  const saveReminder = () => {
    onSetReminder(time);
    onClose();
    if (permission === 'granted') {
      new Notification("Vida en la Palabra", { body: `Recordatorio configurado para las ${time}` });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-indigo-600 p-8 text-center text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="text-5xl mb-4">🔔</div>
          <h2 className="text-2xl font-black uppercase tracking-widest">Recordatorios</h2>
          <p className="text-indigo-100 text-sm mt-2 opacity-80">No pierdas tu cita con la Palabra</p>
        </div>

        <div className="p-8 space-y-6">
          {permission !== 'granted' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-3">Las notificaciones están desactivadas en tu navegador.</p>
              <button onClick={requestPermission} className="w-full py-2 bg-amber-500 text-white rounded-xl text-xs font-bold uppercase shadow-sm">Activar Notificaciones</button>
            </div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Hora de Recordatorio Diaria</label>
            <input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-2xl font-black text-center text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-4">
            <Button className="flex-1" onClick={saveReminder}>Guardar</Button>
            {stats.reminderTime && (
              <Button variant="outline" className="flex-1 text-slate-400 border-slate-200" onClick={() => { onSetReminder(null); onClose(); }}>Desactivar</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Store: React.FC<{ stats: UserStats, onBuyProtector: () => void, onClose: () => void }> = ({ stats, onBuyProtector, onClose }) => {
  const PROTECTOR_COST = 50;
  const canAfford = stats.emeralds >= PROTECTOR_COST;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-indigo-600 p-8 text-center text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="text-5xl mb-4">⛪</div>
          <h2 className="text-2xl font-black uppercase tracking-widest">Tienda Sagrada</h2>
          <p className="text-indigo-100 text-sm mt-2 opacity-80">Equípate para tu viaje espiritual</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🛡️</div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">Protector de Racha</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Evita perder tu racha si olvidas estudiar un día.</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400 mb-2 justify-end">
                <span>{PROTECTOR_COST}</span>
                <span>💎</span>
              </div>
              <Button 
                variant="primary" 
                className="py-1 px-4 text-xs h-auto rounded-xl" 
                disabled={!canAfford}
                onClick={onBuyProtector}
              >
                Comprar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-center">
              <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Tus Gemas</p>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-300">💎 {stats.emeralds}</p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-center">
              <p className="text-[10px] font-black uppercase text-orange-400 mb-1">Tus Escudos</p>
              <p className="text-2xl font-black text-orange-600 dark:text-orange-300">🛡️ {stats.protectors}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
