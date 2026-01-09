
import React from 'react';
import { UserStats } from '../types';
import { Button } from './Button';

interface GamificationHeaderProps {
  stats: UserStats;
  onOpenStore: () => void;
}

export const GamificationHeader: React.FC<GamificationHeaderProps> = ({ stats, onOpenStore }) => {
  return (
    <div className="flex items-center gap-3">
      {/* Racha */}
      <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/30 px-3 py-1.5 rounded-2xl border border-orange-100 dark:border-orange-900/50 transition-all hover:scale-105 cursor-help group relative">
        <span className="text-xl">🔥</span>
        <span className="font-black text-orange-600 dark:text-orange-400">{stats.streak}</span>
        <div className="absolute top-full mt-2 hidden group-hover:block z-[60] w-48 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">Tu Racha Espiritual</p>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Estudia un pasaje cada día para mantener el fuego encendido.</p>
        </div>
      </div>

      {/* Esmeraldas */}
      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 transition-all hover:scale-105 cursor-pointer group" onClick={onOpenStore}>
        <span className="text-xl">💎</span>
        <span className="font-black text-emerald-600 dark:text-emerald-400">{stats.emeralds}</span>
      </div>

      {/* Protectores */}
      <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 transition-all hover:scale-105 cursor-pointer group" onClick={onOpenStore}>
        <span className="text-xl">🛡️</span>
        <span className="font-black text-indigo-600 dark:text-indigo-400">{stats.protectors}</span>
      </div>
    </div>
  );
};

interface StoreProps {
  stats: UserStats;
  onBuyProtector: () => void;
  onClose: () => void;
}

export const Store: React.FC<StoreProps> = ({ stats, onBuyProtector, onClose }) => {
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

        <div className="p-4 bg-slate-50 dark:bg-slate-800 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Consigue más gemas completando estudios y cuestionarios</p>
        </div>
      </div>
    </div>
  );
};
