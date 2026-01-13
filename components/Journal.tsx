
import React from 'react';
import { DevotionalData } from '../types';

interface JournalProps {
  prompts: string[];
  devotionalData?: DevotionalData | null;
  quizAnswers?: Record<number, string>;
  journalAnswers?: Record<number, string>;
  onJournalChange?: (idx: number, text: string) => void;
}

export const Journal: React.FC<JournalProps> = ({ 
  prompts, 
  devotionalData, 
  quizAnswers = {}, 
  journalAnswers = {},
  onJournalChange 
}) => {

  const handleInput = (idx: number, text: string) => {
    if (onJournalChange) onJournalChange(idx, text);
  };

  const exportEverything = () => {
    if (!devotionalData) return;

    let content = `DEVOCIONAL COMPLETO: ${devotionalData.title}\n`;
    content += "============================================================\n";
    content += `Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    content += "============================================================\n\n";

    content += "📖 PASAJE BÍBLICO\n";
    content += "------------------------------------------------------------\n";
    content += `${devotionalData.passageText}\n\n`;

    content += "📚 RESUMEN TEOLÓGICO\n";
    content += "------------------------------------------------------------\n";
    content += `${devotionalData.summary}\n\n`;

    content += "🏛️ CONTEXTO HISTÓRICO\n";
    content += "------------------------------------------------------------\n";
    content += `${devotionalData.historicalContext}\n\n`;

    content += "✨ VERSÍCULOS CLAVE\n";
    content += "------------------------------------------------------------\n";
    (devotionalData.keyVerses || []).forEach((v, i) => {
      content += `${i + 1}. ${v}\n`;
    });
    content += "\n";

    content += "🚀 APLICACIÓN PRÁCTICA\n";
    content += "------------------------------------------------------------\n";
    content += `${devotionalData.practicalApplication}\n\n`;

    content += "🧩 CUESTIONARIO Y RESPUESTAS\n";
    content += "------------------------------------------------------------\n";
    (devotionalData.quiz || []).forEach((q, i) => {
      content += `Pregunta ${i + 1}: ${q.question}\n`;
      content += `Tu Respuesta: ${quizAnswers[i] || "(Sin respuesta)"}\n`;
      content += `Explicación/Comentario: ${q.explanation}\n`;
      content += ".\n";
    });
    content += "\n";

    content += "🖊️ DIARIO DE REFLEXIÓN\n";
    content += "------------------------------------------------------------\n";
    prompts.forEach((prompt, idx) => {
      content += `Pregunta: ${prompt}\n`;
      content += `Respuesta: ${journalAnswers[idx] || "(Sin respuesta)"}\n`;
      content += ".\n";
    });
    content += "\n";

    content += "📅 PLAN SEMANAL SUGERIDO\n";
    content += "------------------------------------------------------------\n";
    (devotionalData.dailyPlan || []).forEach((d) => {
      content += `Día ${d.day}: ${d.focus}\n`;
      content += `Lectura: ${d.verse}\n`;
      content += `Acción: ${d.action}\n`;
      content += ".\n";
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `estudio_completo_${devotionalData.title.replace(/\s+/g, '_').toLowerCase()}.txt`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-serif text-indigo-900 dark:text-indigo-400 border-b dark:border-slate-800 pb-2 inline-block transition-colors">Tu Diario de Reflexión</h3>
      {prompts.map((prompt, idx) => (
        <div key={`prompt-${prompt.slice(0, 20)}`} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all">
          <label className="block text-lg font-medium text-slate-800 dark:text-slate-200 mb-4 transition-colors">{prompt}</label>
          <textarea
            value={journalAnswers[idx] || ""}
            onChange={(e) => handleInput(idx, e.target.value)}
            placeholder="Escribe tus pensamientos aquí..."
            className="w-full h-40 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>
      ))}
      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <button 
          onClick={exportEverything} 
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-all shadow-lg shadow-teal-200 dark:shadow-none"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar Estudio Completo (.txt)
        </button>
        <button 
          onClick={() => window.print()} 
          className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-6 py-3 rounded-2xl transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / PDF
        </button>
      </div>
    </div>
  );
};
