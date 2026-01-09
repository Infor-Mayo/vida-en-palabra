
import React from 'react';
import { DailyPlanDay } from '../types';

interface DailyGuideProps {
  plan: DailyPlanDay[];
}

export const DailyGuide: React.FC<DailyGuideProps> = ({ plan }) => {
  if (!plan || plan.length === 0) return null;

  return (
    <div className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-600 dark:text-amber-400 transition-colors">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-serif text-slate-900 dark:text-slate-100 font-bold transition-colors">Plan de Seguimiento Sugerido</h3>
          <p className="text-slate-500 dark:text-slate-400 transition-colors">Extiende tu estudio durante los próximos días</p>
        </div>
      </div>

      <div className="grid gap-6">
        {plan.map((item) => (
          <div key={item.day} className="group relative bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md dark:hover:border-amber-500/50 transition-all">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-2xl flex flex-col items-center justify-center font-bold transition-colors">
                  <span className="text-[10px] uppercase opacity-60">Día</span>
                  <span className="text-xl leading-none">{item.day}</span>
                </div>
              </div>
              <div className="flex-grow space-y-3">
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors">{item.focus}</h4>
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400 italic transition-colors">
                  <svg className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Lectura: <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.verse}</span></span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 transition-all">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">Acción recomendada</span>
                  <p className="text-emerald-800 dark:text-emerald-200 text-sm font-medium leading-relaxed">{item.action}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
