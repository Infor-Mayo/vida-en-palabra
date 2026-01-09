
import React from 'react';
import { ReadingPlan } from '../types';
import { Button } from './Button';

interface ReadingPlanViewProps {
  plan: ReadingPlan;
  onSelectPassage: (passage: string) => void;
}

export const ReadingPlanView: React.FC<ReadingPlanViewProps> = ({ plan, onSelectPassage }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-block px-4 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold uppercase tracking-widest transition-colors">
          Plan {plan.duration === 'intensive' ? 'Intensivo' : plan.duration === 'weekly' ? 'Semanal' : plan.duration === 'monthly' ? 'Mensual' : 'Anual'}
        </div>
        <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 transition-colors">{plan.title}</h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto transition-colors">{plan.description}</p>
      </div>

      <div className="grid gap-6">
        {plan.items.map((item, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-center hover:shadow-md dark:hover:border-indigo-500 transition-all">
            <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 text-white font-bold transition-all ${
              plan.duration === 'intensive' ? 'bg-rose-500 dark:bg-rose-600' : 
              plan.duration === 'weekly' ? 'bg-indigo-600 dark:bg-indigo-700' :
              plan.duration === 'monthly' ? 'bg-teal-600 dark:bg-teal-700' : 'bg-amber-600 dark:bg-amber-700'
            }`}>
              <span className="text-[10px] uppercase opacity-70 leading-none mb-1">
                {item.id.split(' ')[0] || 'Etapa'}
              </span>
              <span className="text-xl leading-none">{item.id.split(' ')[1] || (index + 1)}</span>
            </div>
            <div className="flex-grow space-y-2 text-center md:text-left transition-all">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{item.theme}</h4>
                <span className="text-indigo-600 dark:text-indigo-400 font-medium px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-sm inline-block w-fit mx-auto md:mx-0 transition-colors">
                  {item.passage}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed transition-colors">{item.reason}</p>
            </div>
            <Button 
              onClick={() => onSelectPassage(item.passage)}
              variant="secondary"
              className="w-full md:w-auto"
            >
              Iniciar Estudio
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
