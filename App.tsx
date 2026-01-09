
import React, { useState, useEffect } from 'react';
import { generateDevotional, generateReadingPlan } from './services/geminiService';
import { AppStatus, DevotionalData, ReadingPlan, PlanDuration, HistoryItem, FavoriteItem, UserStats } from './types';
import { Button } from './components/Button';
import { Quiz } from './components/Quiz';
import { Journal } from './components/Journal';
import { ReadingPlanView } from './components/ReadingPlanView';
import { DailyGuide } from './components/DailyGuide';
import { GamificationHeader, Store } from './components/Gamification';

const HISTORY_KEY = 'devotional_history_v1';
const FAVORITES_KEY = 'devotional_favorites_v1';
const STATS_KEY = 'user_gamification_stats_v1';
const THEME_KEY = 'app_theme_preference';

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
  const [showConfig, setShowConfig] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [currentPassageRef, setCurrentPassageRef] = useState('');
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system');
  
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [journalAnswers, setJournalAnswers] = useState<Record<number, string>>({});

  // Gamificación State
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) return JSON.parse(saved);
    return { streak: 0, lastStudyDate: null, emeralds: 0, protectors: 0 };
  });

  // Efecto para verificar racha al cargar
  useEffect(() => {
    const checkStreak = () => {
      if (!stats.lastStudyDate) return;

      const today = new Date().toISOString().split('T')[0];
      const lastDate = new Date(stats.lastStudyDate);
      const currentDate = new Date(today);
      
      const diffTime = currentDate.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        // Se perdió la racha
        if (stats.protectors > 0) {
          // Usar protector automáticamente
          setStats(prev => {
            const newStats = { ...prev, protectors: prev.protectors - 1, lastStudyDate: today };
            localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
            return newStats;
          });
        } else {
          setStats(prev => {
            const newStats = { ...prev, streak: 0 };
            localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
            return newStats;
          });
        }
      }
    };
    checkStreak();
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, theme);
    };
    applyTheme();
  }, [theme]);

  useEffect(() => {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    const savedFavorites = localStorage.getItem(FAVORITES_KEY);
    if (savedFavorites) try { setFavorites(JSON.parse(savedFavorites)); } catch (e) { console.error(e); }
  }, []);

  const updateStats = (updates: Partial<UserStats>) => {
    setStats(prev => {
      const newStats = { ...prev, ...updates };
      localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
      return newStats;
    });
  };

  const completeDailyStudy = () => {
    const today = new Date().toISOString().split('T')[0];
    if (stats.lastStudyDate === today) return; // Ya estudió hoy

    let newStreak = stats.streak + 1;
    // Si la última vez fue hace más de un día, la racha ya se resetó en useEffect, 
    // pero si es la primera vez del día tras un reset, empezamos de 1.
    if (!stats.lastStudyDate || new Date(today).getTime() - new Date(stats.lastStudyDate).getTime() > (1000 * 60 * 60 * 24)) {
       newStreak = 1;
    }

    updateStats({
      streak: newStreak,
      lastStudyDate: today,
      emeralds: stats.emeralds + 10 // +10 por estudio diario
    });
  };

  const handleGenerate = async (passageStr?: string) => {
    const targetPassage = passageStr || input;
    if (!targetPassage.trim()) return;
    
    setErrorMessage('');
    setStatus('loading');
    setCurrentPassageRef(targetPassage);
    setQuizAnswers({});
    setJournalAnswers({});
    
    try {
      const result = await generateDevotional(targetPassage, numQuestions);
      setData(result);
      const newItem: HistoryItem = { id: Date.now().toString(), title: result.title, passage: targetPassage, timestamp: Date.now() };
      const updatedHistory = [newItem, ...history.filter(h => h.passage !== targetPassage)].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      
      setStatus('content');
      setActiveTab('study');
      completeDailyStudy(); // Actualizar racha al generar con éxito
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Ocurrió un error inesperado.");
      setStatus('error');
    }
  };

  const buyProtector = () => {
    if (stats.emeralds >= 50) {
      updateStats({
        emeralds: stats.emeralds - 50,
        protectors: stats.protectors + 1
      });
    }
  };

  const isStudiedToday = stats.lastStudyDate === new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-900 dark:selection:text-indigo-100">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md cursor-pointer hover:rotate-3 transition-all" onClick={() => setStatus('idle')}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 hidden md:block cursor-pointer tracking-tight" onClick={() => setStatus('idle')}>Vida Palabra</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <GamificationHeader stats={stats} onOpenStore={() => setStatus('store')} />
            
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden xs:block"></div>

            <button onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400">
              {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🖥️'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Recordatorio de Racha */}
        {!isStudiedToday && status === 'idle' && (
          <div className="mb-10 p-5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl text-white shadow-lg shadow-orange-200 dark:shadow-none flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <span className="text-3xl animate-bounce">🔥</span>
              <div>
                <p className="font-black uppercase tracking-widest text-[10px] opacity-80">Racha en peligro</p>
                <p className="font-bold text-lg leading-none">¡No has realizado tu estudio hoy!</p>
              </div>
            </div>
            <div className="hidden sm:block text-xs font-medium bg-white/20 px-3 py-1.5 rounded-full">Protege tu racha de {stats.streak} días</div>
          </div>
        )}

        {status === 'idle' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-serif font-bold text-indigo-900 dark:text-indigo-400 transition-colors">Tu Compañero Espiritual</h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto">Profundiza en las escrituras y mantén el hábito vivo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {/* Opción 1: Pasaje */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black">01</div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Estudio Rápido</h3>
                </div>
                <textarea 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Ej: Salmo 23, Mateo 5:1-12..." 
                  className="w-full flex-grow p-5 text-lg rounded-2xl border-2 border-slate-100 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 shadow-inner bg-slate-50 dark:bg-slate-800 dark:text-white outline-none transition-all resize-none min-h-[120px]" 
                />
                <Button className="mt-6 w-full h-14" onClick={() => handleGenerate()} disabled={!input.trim()}>Estudiar Ahora</Button>
              </div>

              {/* Opción 2: Planes */}
              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100 dark:shadow-none flex flex-col relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                   <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center font-black">02</div>
                  <h3 className="text-xl font-bold">Plan Temático</h3>
                </div>
                <div className="flex-grow space-y-4">
                  <input type="text" value={planTopic} onChange={(e) => setPlanTopic(e.target.value)} placeholder="Tema: Paz, Familia, Trabajo..." className="w-full p-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-slate-400 focus:bg-white/20 outline-none transition-all" />
                  <div className="grid grid-cols-2 gap-2">
                    {['Intensivo', 'Semanal', 'Mensual', 'Anual'].map((lbl) => (
                      <button 
                        key={lbl} 
                        onClick={() => setPlanDuration(lbl.toLowerCase().replace('intensivo', 'intensive') as any)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${planDuration === lbl.toLowerCase() ? 'bg-teal-400 border-teal-400 text-slate-900' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <Button variant="secondary" className="mt-6 w-full h-14 bg-teal-400 hover:bg-teal-300 text-slate-900" onClick={async () => {
                  setErrorMessage(''); setStatus('loading_plan');
                  try { const p = await generateReadingPlan(planTopic, planDuration); setPlanData(p); setStatus('viewing_plan'); }
                  catch (e: any) { setErrorMessage(e.message); setStatus('error'); }
                }} disabled={!planTopic.trim()}>Diseñar Plan</Button>
              </div>
            </div>

            {/* Acceso rápido a Historial/Favoritos */}
            <div className="flex justify-center gap-4">
              <Button variant="outline" className="px-8 border-slate-200 dark:border-slate-800" onClick={() => setStatus('viewing_favorites')}>
                Mis Favoritos ({favorites.length})
              </Button>
              <Button variant="outline" className="px-8 border-slate-200 dark:border-slate-800" onClick={() => setStatus('viewing_history')}>
                Historial Reciente
              </Button>
            </div>
          </div>
        )}

        {status === 'store' && (
          <Store stats={stats} onClose={() => setStatus('idle')} onBuyProtector={buyProtector} />
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="relative">
              <div className="w-24 h-24 border-8 border-slate-100 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-3xl">📜</div>
            </div>
            <div>
              <h3 className="text-3xl font-serif font-bold text-slate-800 dark:text-slate-100">Consultando las Escrituras...</h3>
              <p className="text-slate-500 dark:text-slate-400 italic mt-2">Estamos preparando un estudio profundo para ti.</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 dark:bg-red-900/20 p-10 rounded-[2.5rem] border border-red-100 dark:border-red-900/30 text-center space-y-6">
            <div className="text-6xl">🤕</div>
            <h3 className="text-2xl font-bold text-red-900 dark:text-red-400">Hubo un contratiempo</h3>
            <p className="text-red-700 dark:text-red-300 max-w-md mx-auto">{errorMessage}</p>
            <Button onClick={() => setStatus('idle')} className="px-10">Intentar de nuevo</Button>
          </div>
        )}

        {status === 'viewing_plan' && planData && (
          <div className="animate-in slide-in-from-bottom-8 duration-700">
             <button onClick={() => setStatus('idle')} className="mb-6 flex items-center gap-2 text-indigo-600 font-bold hover:translate-x-1 transition-all">← Volver al menú</button>
             <ReadingPlanView plan={planData} onSelectPassage={handleGenerate} />
          </div>
        )}

        {status === 'viewing_history' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center justify-between">
                <h2 className="text-3xl font-serif font-bold">Tu Historial</h2>
                <button onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY); }} className="text-xs font-black uppercase text-red-500 hover:opacity-50 transition-all">Borrar todo</button>
             </div>
             {history.length === 0 ? <p className="py-20 text-center text-slate-400">Aún no has realizado estudios.</p> : (
               <div className="grid gap-4">
                 {history.map(h => (
                   <div key={h.id} onClick={() => handleGenerate(h.passage)} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-500 transition-all">
                      <div><p className="font-bold text-lg">{h.title}</p><p className="text-indigo-500 font-medium">{h.passage}</p></div>
                      <div className="text-xs text-slate-400 font-bold">{new Date(h.timestamp).toLocaleDateString()}</div>
                   </div>
                 ))}
               </div>
             )}
             <Button variant="outline" className="w-full" onClick={() => setStatus('idle')}>Volver</Button>
          </div>
        )}

        {status === 'viewing_favorites' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <h2 className="text-3xl font-serif font-bold">Mis Favoritos</h2>
             {favorites.length === 0 ? <p className="py-20 text-center text-slate-400">No has guardado ningún pasaje favorito.</p> : (
               <div className="grid gap-4">
                 {favorites.map(f => (
                   <div key={f.id} onClick={() => handleGenerate(f.passage)} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-500 transition-all">
                      <div><p className="font-bold text-lg">{f.title}</p><p className="text-indigo-500 font-medium">{f.passage}</p></div>
                      <button onClick={(e) => { e.stopPropagation(); setFavorites(prev => prev.filter(x => x.id !== f.id)); }} className="text-red-400 hover:text-red-600 transition-colors">🗑️</button>
                   </div>
                 ))}
               </div>
             )}
             <Button variant="outline" className="w-full" onClick={() => setStatus('idle')}>Volver</Button>
          </div>
        )}

        {status === 'content' && data && (
          <div className="space-y-10 animate-in slide-in-from-bottom-6 duration-700">
            <div className="text-center space-y-4">
               <h2 className="text-5xl font-serif font-bold text-slate-900 dark:text-slate-100">{data.title}</h2>
               <div className="flex justify-center gap-4">
                  <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-xs font-black uppercase tracking-widest">{currentPassageRef}</span>
                  <button onClick={() => {
                    const isFav = favorites.some(f => f.passage === currentPassageRef);
                    if (isFav) setFavorites(prev => prev.filter(f => f.passage !== currentPassageRef));
                    else setFavorites(prev => [{ id: Date.now().toString(), title: data.title, passage: currentPassageRef }, ...prev]);
                  }} className={`text-2xl transition-all hover:scale-125 ${favorites.some(f => f.passage === currentPassageRef) ? 'grayscale-0' : 'grayscale opacity-30'}`}>⭐</button>
               </div>
            </div>

            <div className="flex justify-center p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl max-w-sm mx-auto">
              {['Estudio', 'Quiz', 'Diario'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab.toLowerCase().replace('estudio', 'study') as any)}
                  className={`flex-grow py-2.5 px-6 rounded-xl text-sm font-black transition-all ${activeTab === (tab.toLowerCase().replace('estudio', 'study')) ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="min-h-[60vh]">
              {activeTab === 'study' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                  <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none italic font-serif text-2xl text-slate-700 dark:text-slate-300 leading-relaxed text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 p-4 opacity-5 text-indigo-900 dark:text-white"><svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16L9.017 16C7.91243 16 7.017 16.8954 7.017 18L7.017 21M17.017 21L17.017 18C17.017 14.134 13.883 11 10.017 11L7.017 11C3.15101 11 0.017 14.134 0.017 18L0.017 21M24.017 21L24.017 18C24.017 12.4772 19.5398 8 14.017 8L11.017 8C5.49415 8 1.017 12.4772 1.017 18L1.017 21"/></svg></div>
                    <p className="relative z-10">"{data.passageText}"</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <h4 className="text-indigo-600 font-black uppercase text-[10px] tracking-widest mb-3">Resumen Espiritual</h4>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{data.summary}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <h4 className="text-teal-600 font-black uppercase text-[10px] tracking-widest mb-3">Contexto del Texto</h4>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{data.historicalContext}</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/10 p-10 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/30">
                    <h4 className="text-amber-600 font-black uppercase text-[10px] tracking-widest mb-8 text-center">Versículos para Memorizar</h4>
                    <div className="space-y-4">
                      {data.keyVerses.map((v, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-amber-200/50 shadow-sm flex items-start gap-4 hover:border-indigo-500 cursor-pointer transition-all" onClick={() => handleGenerate(v)}>
                          <span className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 flex items-center justify-center font-black shrink-0 text-xs">{i+1}</span>
                          <p className="text-lg italic text-amber-900 dark:text-amber-200">"{v}"</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-500 p-10 rounded-[2.5rem] text-white shadow-xl shadow-emerald-200 dark:shadow-none">
                     <h4 className="font-black uppercase text-[10px] tracking-widest mb-4 opacity-70 text-center sm:text-left">Reto del Día</h4>
                     <p className="text-2xl font-serif leading-snug text-center sm:text-left">{data.practicalApplication}</p>
                  </div>

                  <DailyGuide plan={data.dailyPlan} />
                </div>
              )}

              {activeTab === 'quiz' && (
                <div className="animate-in slide-in-from-right-8 duration-500">
                  <Quiz 
                    questions={data.quiz} 
                    answers={quizAnswers}
                    onAnswerChange={(idx, val) => {
                      setQuizAnswers(prev => ({ ...prev, [idx]: val }));
                      updateStats({ emeralds: stats.emeralds + 1 }); // +1 por cada respuesta
                    }}
                  />
                </div>
              )}

              {activeTab === 'journal' && (
                <div className="animate-in slide-in-from-right-8 duration-500">
                   <Journal 
                    prompts={data.reflectionPrompts} 
                    devotionalData={data}
                    quizAnswers={quizAnswers}
                    journalAnswers={journalAnswers}
                    onJournalChange={(idx, val) => {
                      setJournalAnswers(prev => ({ ...prev, [idx]: val }));
                      updateStats({ emeralds: stats.emeralds + 1 }); // +1 por cada reflexión escrita
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 py-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-slate-400 font-medium">© {new Date().getFullYear()} Vida en la Palabra</p>
        <div className="flex justify-center gap-6 mt-4">
           {['Estudia', 'Medita', 'Vive'].map(v => <span key={v} className="text-[10px] font-black uppercase text-indigo-400 tracking-tighter">{v}</span>)}
        </div>
      </footer>
    </div>
  );
};

export default App;
