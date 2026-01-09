
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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [currentPassageRef, setCurrentPassageRef] = useState('');
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system');
  
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [journalAnswers, setJournalAnswers] = useState<Record<number, string>>({});

  // Gamificación State con protección contra JSON corrupto
  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STATS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error cargando estadísticas iniciales", e);
    }
    return { streak: 0, lastStudyDate: null, emeralds: 0, protectors: 0 };
  });

  // Efecto para verificar racha al cargar
  useEffect(() => {
    const checkStreak = () => {
      if (!stats.lastStudyDate) return;

      const today = new Date().toISOString().split('T')[0];
      const lastDate = new Date(stats.lastStudyDate);
      const currentDate = new Date(today);
      
      if (isNaN(lastDate.getTime())) return;

      const diffTime = currentDate.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        // Se perdió la racha
        if (stats.protectors > 0) {
          // Usar protector automáticamente
          setStats(prev => {
            const newStats = { ...prev, protectors: Math.max(0, prev.protectors - 1), lastStudyDate: today };
            localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
            return newStats;
          });
        } else if (stats.streak > 0) {
          setStats(prev => {
            const newStats = { ...prev, streak: 0 };
            localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
            return newStats;
          });
        }
      }
    };
    checkStreak();
  }, [stats.lastStudyDate, stats.protectors, stats.streak]);

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
    if (stats.lastStudyDate === today) return;

    const lastDate = stats.lastStudyDate ? new Date(stats.lastStudyDate) : null;
    const currentDate = new Date(today);
    
    let newStreak = stats.streak + 1;
    if (lastDate) {
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) newStreak = 1;
    } else {
      newStreak = 1;
    }

    updateStats({
      streak: newStreak,
      lastStudyDate: today,
      emeralds: stats.emeralds + 10
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
      completeDailyStudy();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Ocurrió un error inesperado al conectar con la IA.");
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md cursor-pointer hover:scale-110 transition-all" onClick={() => setStatus('idle')}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 hidden md:block cursor-pointer" onClick={() => setStatus('idle')}>Vida Palabra</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <GamificationHeader stats={stats} onOpenStore={() => setStatus('store')} />
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🖥️'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {!isStudiedToday && status === 'idle' && (
          <div className="mb-10 p-5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl text-white shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl animate-bounce">🔥</span>
              <div>
                <p className="font-black uppercase text-[10px] opacity-80">Racha en peligro</p>
                <p className="font-bold text-lg">¡Haz tu estudio diario para no perder tu racha!</p>
              </div>
            </div>
          </div>
        )}

        {status === 'idle' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-serif font-bold text-indigo-900 dark:text-indigo-400">Tu Compañero Espiritual</h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto">Profundiza en las escrituras mediante el poder de la IA.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col">
                <h3 className="text-xl font-bold mb-4">Estudio Rápido</h3>
                <textarea 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Ej: Job 1, Salmo 23..." 
                  className="w-full flex-grow p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:border-indigo-500 min-h-[120px]" 
                />
                <Button className="mt-6 w-full h-14" onClick={() => handleGenerate()} disabled={!input.trim()}>Generar Devocional</Button>
              </div>

              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col">
                <h3 className="text-xl font-bold mb-4">Plan Temático</h3>
                <input type="text" value={planTopic} onChange={(e) => setPlanTopic(e.target.value)} placeholder="Tema: Paz, Esperanza..." className="w-full p-4 rounded-xl bg-white/10 border border-white/10 text-white outline-none mb-4" />
                <Button variant="secondary" className="mt-auto h-14 bg-teal-400 text-slate-900" onClick={async () => {
                  setErrorMessage(''); setStatus('loading_plan');
                  try { const p = await generateReadingPlan(planTopic, planDuration); setPlanData(p); setStatus('viewing_plan'); }
                  catch (e: any) { setErrorMessage(e.message); setStatus('error'); }
                }} disabled={!planTopic.trim()}>Crear Itinerario</Button>
              </div>
            </div>
          </div>
        )}

        {status === 'store' && <Store stats={stats} onClose={() => setStatus('idle')} onBuyProtector={buyProtector} />}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-lg font-medium">Preparando tu estudio...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 dark:bg-red-900/20 p-10 rounded-[2.5rem] text-center space-y-4">
            <h3 className="text-xl font-bold text-red-600">Ocurrió un error</h3>
            <p>{errorMessage}</p>
            <Button onClick={() => setStatus('idle')}>Volver a Intentar</Button>
          </div>
        )}

        {status === 'viewing_plan' && planData && (
          <ReadingPlanView plan={planData} onSelectPassage={handleGenerate} />
        )}

        {status === 'content' && data && (
          <div className="space-y-10">
            <div className="text-center">
               <h2 className="text-4xl font-serif font-bold">{data.title}</h2>
               <p className="text-indigo-600 font-bold mt-2 uppercase tracking-widest">{currentPassageRef}</p>
            </div>

            <div className="flex justify-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-xs mx-auto">
              {['study', 'quiz', 'journal'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-grow py-2 rounded-xl text-sm font-bold capitalize ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >
                  {tab === 'study' ? 'Estudio' : tab === 'quiz' ? 'Quiz' : 'Diario'}
                </button>
              ))}
            </div>

            {activeTab === 'study' && (
              <div className="space-y-8 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 italic font-serif text-xl leading-relaxed text-center">
                  "{data.passageText}"
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <h4 className="font-black text-[10px] text-indigo-500 uppercase mb-2">Resumen</h4>
                    <p className="text-sm">{data.summary}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <h4 className="font-black text-[10px] text-teal-500 uppercase mb-2">Contexto</h4>
                    <p className="text-sm">{data.historicalContext}</p>
                  </div>
                </div>
                <DailyGuide plan={data.dailyPlan} />
              </div>
            )}

            {activeTab === 'quiz' && <Quiz questions={data.quiz} onAnswerChange={() => updateStats({ emeralds: stats.emeralds + 1 })} />}
            {activeTab === 'journal' && <Journal prompts={data.reflectionPrompts} devotionalData={data} onJournalChange={() => updateStats({ emeralds: stats.emeralds + 1 })} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
