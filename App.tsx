
import React, { useState, useEffect } from 'react';
import { generateDevotional, generateReadingPlan } from './services/geminiService';
import { AppStatus, DevotionalData, ReadingPlan, PlanDuration, UserStats, AIProvider } from './types';
import { Button } from './components/Button';
import { Quiz } from './components/Quiz';
import { Journal } from './components/Journal';
import { ReadingPlanView } from './components/ReadingPlanView';
import { DailyGuide } from './components/DailyGuide';
import { GamificationHeader, Store } from './components/Gamification';

const STATS_KEY = 'user_gamification_stats_v1';
const THEME_KEY = 'app_theme_preference';
const PROVIDER_KEY = 'app_ai_provider_preference';

type ThemeMode = 'light' | 'dark' | 'system';

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
  
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => (localStorage.getItem(PROVIDER_KEY) as AIProvider) || 'gemini');
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system');
  
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

    setErrorMessage('');
    setStatus('loading');
    try {
      const result = await generateDevotional(targetPassage, aiProvider, numQuestions);
      setData(result);
      setStatus('content');
      setActiveTab('study');
      
      // Bonus por estudio
      setStats(prev => ({...prev, emeralds: prev.emeralds + 10}));
    } catch (error: any) {
      console.error("Error capturado:", error);
      setErrorMessage(error.message || "Error inesperado al conectar con el servidor.");
      setStatus('error');
    }
  };

  const isHome = status === 'idle' || status === 'loading' || status === 'error' || status === 'loading_plan';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 font-sans">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setStatus('idle'); setErrorMessage(''); setData(null); setPlanData(null); }}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h1 className="text-xl font-black hidden md:block tracking-tight text-slate-800 dark:text-slate-100">Vida Palabra</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex border border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => { setAiProvider('gemma'); setErrorMessage(''); }} 
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${aiProvider === 'gemma' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Gemma (Free)
              </button>
              <button 
                onClick={() => { setAiProvider('gemini'); setErrorMessage(''); }} 
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${aiProvider === 'gemini' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Gemini (Free)
              </button>
            </div>
            <GamificationHeader stats={stats} onOpenStore={() => setStatus('store')} />
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-xl">
              {theme === 'light' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {isHome && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="text-center space-y-4">
              <h2 className="text-5xl md:text-6xl font-serif font-bold text-indigo-950 dark:text-indigo-300 transition-colors">Estudio Bíblico Gratis</h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 transition-colors max-w-2xl mx-auto">Usando Gemini 3 Flash y Gemma para profundizar en tu fe.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col transition-all hover:border-indigo-200">
                <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">Analizar Pasaje</h3>
                <textarea 
                  value={input} 
                  onChange={(e) => { setInput(e.target.value); setErrorMessage(''); }} 
                  placeholder="Ej: Romanos 12:1-2, Salmo 91..." 
                  className="w-full flex-grow p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:border-indigo-500 min-h-[140px] transition-all text-slate-800 dark:text-slate-200" 
                />
                
                {errorMessage && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-2xl border border-red-100 dark:border-red-900/50 flex gap-2 items-start overflow-hidden">
                    <span className="text-lg">⚠️</span>
                    <span className="break-words">{errorMessage}</span>
                  </div>
                )}

                <Button 
                  className="mt-6 w-full py-4 text-lg" 
                  onClick={() => handleGenerate()} 
                  disabled={!input.trim() || status === 'loading'}
                  isLoading={status === 'loading'}
                >
                  Generar Devocional
                </Button>
              </div>

              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col border border-white/5">
                <h3 className="text-xl font-bold mb-4">Plan de Lectura</h3>
                <input 
                  type="text" 
                  value={planTopic} 
                  onChange={(e) => { setPlanTopic(e.target.value); setErrorMessage(''); }} 
                  placeholder="Tema: Paz, Matrimonio, Liderazgo..." 
                  className="w-full p-4 rounded-xl bg-white/10 border border-white/10 text-white outline-none mb-4 focus:ring-2 focus:ring-teal-400 transition-all placeholder:text-white/30" 
                />
                <div className="flex gap-2 mb-6">
                  {['weekly', 'monthly'].map(d => (
                    <button 
                      key={d} 
                      onClick={() => setPlanDuration(d as any)}
                      className={`flex-grow py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${planDuration === d ? 'bg-teal-400 border-teal-400 text-slate-900 shadow-lg' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}
                    >
                      {d === 'weekly' ? '7 Días' : '30 Días'}
                    </button>
                  ))}
                </div>
                <Button 
                  variant="secondary" 
                  className="mt-auto bg-teal-400 text-slate-900 border-none hover:bg-teal-300 py-4 text-lg" 
                  onClick={async () => {
                    setErrorMessage('');
                    setStatus('loading_plan');
                    try {
                      const p = await generateReadingPlan(planTopic, planDuration, aiProvider);
                      setPlanData(p);
                      setStatus('viewing_plan');
                    } catch (e: any) {
                      setErrorMessage(e.message);
                      setStatus('error');
                    }
                  }} 
                  disabled={!planTopic.trim() || status === 'loading_plan'}
                  isLoading={status === 'loading_plan'}
                >
                  Diseñar Itinerario
                </Button>
              </div>
            </div>
            
            {(status === 'loading' || status === 'loading_plan') && (
              <div className="text-center space-y-4 animate-pulse">
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">Inspirando tu estudio...</p>
                <p className="text-sm text-slate-500">Si un modelo falla, prueba cambiar a "{aiProvider === 'gemini' ? 'Gemma' : 'Gemini'}" en el menú superior.</p>
              </div>
            )}
          </div>
        )}

        {status === 'content' && data && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="text-center">
               <h2 className="text-5xl font-serif font-bold text-slate-900 dark:text-slate-100 transition-colors leading-tight">{data.title}</h2>
               <p className="text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-[0.2em] text-sm mt-2">{input}</p>
            </div>

            <div className="flex justify-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-[1.25rem] max-w-sm mx-auto shadow-inner">
              {['study', 'quiz', 'journal'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-grow py-3 px-4 rounded-2xl text-[11px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md' : 'text-slate-500'}`}
                >
                  {tab === 'study' ? 'Estudio' : tab === 'quiz' ? 'Reto' : 'Diario'}
                </button>
              ))}
            </div>

            <div className="min-h-[500px]">
              {activeTab === 'study' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 italic font-serif text-2xl leading-relaxed text-center shadow-lg transition-all text-slate-800 dark:text-slate-100">
                    "{data.passageText}"
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all">
                      <h4 className="font-black text-[10px] text-indigo-500 uppercase mb-4 tracking-[0.2em]">Explicación</h4>
                      <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{data.summary}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all">
                      <h4 className="font-black text-[10px] text-teal-500 uppercase mb-4 tracking-[0.2em]">Contexto</h4>
                      <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{data.historicalContext}</p>
                    </div>
                  </div>

                  <div className="bg-indigo-600 text-white p-10 rounded-[3rem] shadow-2xl">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-80">Aplicación Diaria</h4>
                    <p className="text-2xl font-serif italic leading-relaxed">"{data.practicalApplication}"</p>
                  </div>
                  
                  <DailyGuide plan={data.dailyPlan} />
                </div>
              )}

              {activeTab === 'quiz' && <div className="animate-in fade-in slide-in-from-right-4 duration-500"><Quiz questions={data.quiz} /></div>}
              {activeTab === 'journal' && <div className="animate-in fade-in slide-in-from-right-4 duration-500"><Journal prompts={data.reflectionPrompts} devotionalData={data} /></div>}
            </div>
          </div>
        )}

        {status === 'viewing_plan' && planData && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <ReadingPlanView 
              plan={planData} 
              onSelectPassage={(p) => {
                setInput(p);
                handleGenerate(p);
              }} 
            />
            <div className="mt-12 flex justify-center">
              <Button onClick={() => setStatus('idle')} variant="outline" className="px-10 border-slate-300 text-slate-600">Crear otro plan</Button>
            </div>
          </div>
        )}

        {status === 'store' && (
          <Store 
            stats={stats} 
            onClose={() => setStatus('idle')} 
            onBuyProtector={() => {
              if (stats.emeralds >= 50) {
                setStats(prev => ({
                  ...prev,
                  emeralds: prev.emeralds - 50,
                  protectors: prev.protectors + 1
                }));
              }
            }} 
          />
        )}
      </main>
      
      <footer className="mt-20 py-10 border-t border-slate-200 dark:border-slate-800 text-center space-y-2 text-slate-400">
        <p className="text-sm font-bold tracking-widest uppercase">Vida en la Palabra © 2025</p>
        <p className="text-xs">Usa Gemini 3 Flash para una experiencia gratuita y estable.</p>
      </footer>
    </div>
  );
};

export default App;
