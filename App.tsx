
import React, { useState, useEffect } from 'react';
import { generateDevotional, generateReadingPlan } from './services/geminiService';
import { AppStatus, DevotionalData, ReadingPlan, PlanDuration, HistoryItem, FavoriteItem, UserStats, AIProvider } from './types';
import { Button } from './components/Button';
import { Quiz } from './components/Quiz';
import { Journal } from './components/Journal';
import { ReadingPlanView } from './components/ReadingPlanView';
import { DailyGuide } from './components/DailyGuide';
import { GamificationHeader, Store } from './components/Gamification';

const HISTORY_KEY = 'devotional_history_v1';
const STATS_KEY = 'user_gamification_stats_v1';
const THEME_KEY = 'app_theme_preference';
const PROVIDER_KEY = 'app_ai_provider_preference';

type ThemeMode = 'light' | 'dark' | 'system';

interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

// Fix: All declarations of 'aistudio' must have identical modifiers.
// Merging with global Window requires matching the optionality of the environment's declaration.
declare global {
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [data, setData] = useState<DevotionalData | null>(null);
  const [planData, setPlanData] = useState<ReadingPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'study' | 'quiz' | 'journal'>('study');
  const [planTopic, setPlanTopic] = useState('');
  const [planDuration, setPlanDuration] = useState<PlanDuration>('weekly');
  const [numQuestions, setNumQuestions] = useState(10);
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => (localStorage.getItem(PROVIDER_KEY) as AIProvider) || 'gemma');
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system');
  
  // Detección inicial de llaves desde el entorno
  const [hasGeminiKey, setHasGeminiKey] = useState(!!process.env.API_KEY);
  const [hasGemmaKey, setHasGemmaKey] = useState(!!process.env.OpenRouter_API_KEY);

  useEffect(() => {
    const checkKeys = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey || process.env.API_KEY) {
          setHasGeminiKey(true);
        }
      }
      setHasGemmaKey(!!process.env.OpenRouter_API_KEY);
    };
    checkKeys();
  }, []);

  useEffect(() => {
    localStorage.setItem(PROVIDER_KEY, aiProvider);
  }, [aiProvider]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const handleOpenKeySelector = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasGeminiKey(true);
    }
  };

  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STATS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { streak: 0, lastStudyDate: null, emeralds: 0, protectors: 0 };
  });

  const handleGenerate = async (passageStr?: string) => {
    const targetPassage = passageStr || input;
    if (!targetPassage.trim()) return;

    // Validación según el proveedor seleccionado
    if (aiProvider === 'gemini' && !hasGeminiKey && !process.env.API_KEY) {
      setErrorMessage("Para usar Gemini 3 Pro, selecciona una API Key de Google.");
      return;
    }
    
    if (aiProvider === 'gemma' && !hasGemmaKey && !process.env.OpenRouter_API_KEY) {
      setErrorMessage("No se encontró la clave 'OpenRouter_API_KEY' en tu entorno.");
      return;
    }

    setErrorMessage('');
    setStatus('loading');
    try {
      const result = await generateDevotional(targetPassage, aiProvider, numQuestions);
      setData(result);
      setStatus('content');
      setActiveTab('study');
    } catch (error: any) {
      setErrorMessage(error.message);
      setStatus('error');
      if (aiProvider === 'gemini' && (error.message.includes("not found") || error.message.includes("401"))) {
        setHasGeminiKey(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStatus('idle')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h1 className="text-xl font-black hidden md:block tracking-tight">Vida Palabra</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
              <button 
                onClick={() => setAiProvider('gemma')} 
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${aiProvider === 'gemma' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                Gemma 3
              </button>
              <button 
                onClick={() => setAiProvider('gemini')} 
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${aiProvider === 'gemini' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                Gemini 3
              </button>
            </div>
            <GamificationHeader stats={stats} onOpenStore={() => setStatus('store')} />
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
              {theme === 'light' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {aiProvider === 'gemini' && !hasGeminiKey && !process.env.API_KEY && (
          <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-400">Configuración de Gemini</p>
              <p className="text-sm text-amber-700 dark:text-amber-500">Para usar Gemini 3 Pro, necesitas una API Key de Google.</p>
            </div>
            <Button onClick={handleOpenKeySelector} className="h-10 text-xs px-8">Autorizar con Google</Button>
          </div>
        )}

        {status === 'idle' && (
          <div className="space-y-12 animate-in fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-serif font-bold text-indigo-900 dark:text-indigo-400">Tu Compañero Espiritual</h2>
              <p className="text-lg text-slate-500 dark:text-slate-400">Explora las escrituras con el apoyo de Inteligencia Artificial.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col transition-all">
                <h3 className="text-xl font-bold mb-4">Estudio de Pasaje</h3>
                <textarea 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Ej: Juan 3:16, Salmo 23..." 
                  className="w-full flex-grow p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:border-indigo-500 min-h-[120px] transition-all" 
                />
                <Button className="mt-6 w-full" onClick={() => handleGenerate()} disabled={!input.trim()}>Generar Devocional</Button>
              </div>

              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col">
                <h3 className="text-xl font-bold mb-4">Plan Temático</h3>
                <input 
                  type="text" 
                  value={planTopic} 
                  onChange={(e) => setPlanTopic(e.target.value)} 
                  placeholder="Tema: Paz, Liderazgo, Fe..." 
                  className="w-full p-4 rounded-xl bg-white/10 border border-white/10 text-white outline-none mb-4 focus:ring-2 focus:ring-teal-400 transition-all" 
                />
                <div className="flex gap-2 mb-6">
                  {['weekly', 'monthly'].map(d => (
                    <button 
                      key={d} 
                      onClick={() => setPlanDuration(d as any)}
                      className={`flex-grow py-2 rounded-lg text-[10px] font-black uppercase transition-all ${planDuration === d ? 'bg-teal-400 text-slate-900' : 'bg-white/5 text-white/50'}`}
                    >
                      {d === 'weekly' ? 'Semanal' : 'Mensual'}
                    </button>
                  ))}
                </div>
                <Button variant="secondary" className="mt-auto bg-teal-400 text-slate-900 border-none hover:bg-teal-300" onClick={async () => {
                  setStatus('loading_plan');
                  try {
                    const p = await generateReadingPlan(planTopic, planDuration, aiProvider);
                    setPlanData(p);
                    setStatus('viewing_plan');
                  } catch (e: any) {
                    setErrorMessage(e.message);
                    setStatus('error');
                  }
                }} disabled={!planTopic.trim()}>Diseñar Plan</Button>
              </div>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="text-xl font-bold">Inspirando resultados con {aiProvider === 'gemma' ? 'Gemma' : 'Gemini'}...</p>
              <p className="text-sm text-slate-500">Estamos preparando tu material de estudio.</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 dark:bg-red-900/20 p-10 rounded-[2.5rem] text-center space-y-4 border border-red-100 dark:border-red-900/30 animate-in zoom-in-95">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Error de Conexión</h3>
            <p className="text-slate-600 dark:text-red-300 max-w-md mx-auto">{errorMessage}</p>
            <div className="flex justify-center gap-4 mt-6">
               <Button onClick={() => setStatus('idle')} variant="outline">Volver al Inicio</Button>
               {aiProvider === 'gemini' && <Button onClick={handleOpenKeySelector}>Configurar Clave</Button>}
            </div>
          </div>
        )}

        {status === 'content' && data && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center">
               <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 transition-colors">{data.title}</h2>
               <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mt-2 transition-colors">{input}</p>
            </div>

            <div className="flex justify-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-xs mx-auto">
              {['study', 'quiz', 'journal'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-grow py-2 rounded-xl text-xs font-bold capitalize transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >
                  {tab === 'study' ? 'Estudio' : tab === 'quiz' ? 'Desafío' : 'Diario'}
                </button>
              ))}
            </div>

            {activeTab === 'study' && (
              <div className="space-y-8 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 italic font-serif text-xl leading-relaxed text-center shadow-sm transition-all">
                  "{data.passageText}"
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all">
                    <h4 className="font-black text-[10px] text-indigo-500 uppercase mb-2 tracking-tighter">Resumen Teológico</h4>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{data.summary}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all">
                    <h4 className="font-black text-[10px] text-teal-500 uppercase mb-2 tracking-tighter">Contexto Histórico</h4>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{data.historicalContext}</p>
                  </div>
                </div>
                <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl">
                  <h4 className="text-xs font-black uppercase tracking-widest mb-4 opacity-70">Aplicación Práctica</h4>
                  <p className="text-lg font-serif italic leading-relaxed">"{data.practicalApplication}"</p>
                </div>
                <DailyGuide plan={data.dailyPlan} />
              </div>
            )}

            {activeTab === 'quiz' && <Quiz questions={data.quiz} />}
            {activeTab === 'journal' && <Journal prompts={data.reflectionPrompts} devotionalData={data} />}
          </div>
        )}

        {status === 'viewing_plan' && planData && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <ReadingPlanView 
              plan={planData} 
              onSelectPassage={(p) => {
                setInput(p);
                handleGenerate(p);
              }} 
            />
            <div className="mt-8 flex justify-center">
              <Button onClick={() => setStatus('idle')} variant="outline">Crear otro plan</Button>
            </div>
          </div>
        )}

        {status === 'loading_plan' && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-6">
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xl font-bold">Diseñando tu itinerario bíblico...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
