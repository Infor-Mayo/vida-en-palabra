
import React, { useState, useEffect } from 'react';
import { generateDevotional, generateReadingPlan } from './services/geminiService';
import { AppStatus, DevotionalData, ReadingPlan, PlanDuration, UserStats, ModelType, QuizDifficulty } from './types';
import { Button } from './components/Button';
import { Quiz } from './components/Quiz';
import { Journal } from './components/Journal';
import { ReadingPlanView } from './components/ReadingPlanView';
import { DailyGuide } from './components/DailyGuide';
import { GamificationHeader, Store, StreakCalendar, ReminderSettings } from './components/Gamification';

const STATS_KEY = 'user_gamification_stats_v1';
const THEME_KEY = 'app_theme_preference';
const MODEL_KEY = 'app_ai_model_preference';
const DIFFICULTY_KEY = 'app_quiz_difficulty_preference';
const NUM_QUESTIONS_KEY = 'app_num_questions_preference';

type ThemeMode = 'light' | 'dark' | 'system';

const DEFAULT_STATS: UserStats = { 
  streak: 0, 
  lastStudyDate: null, 
  studyHistory: [], 
  emeralds: 0, 
  protectors: 0, 
  reminderTime: null 
};

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [data, setData] = useState<DevotionalData | null>(null);
  const [planData, setPlanData] = useState<ReadingPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'study' | 'quiz' | 'journal'>('study');
  const [planTopic, setPlanTopic] = useState('');
  const [planDuration, setPlanDuration] = useState<PlanDuration>('weekly');
  
  const [difficulty, setDifficulty] = useState<QuizDifficulty>(() => (localStorage.getItem(DIFFICULTY_KEY) as QuizDifficulty) || 'medium');
  const [numQuestions, setNumQuestions] = useState<number>(() => Number(localStorage.getItem(NUM_QUESTIONS_KEY)) || 5);
  const [modelType, setModelType] = useState<ModelType>(() => (localStorage.getItem(MODEL_KEY) as ModelType) || 'flash');
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system');
  
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [journalAnswers, setJournalAnswers] = useState<Record<number, string>>({});
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);

  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STATS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Mezclamos con DEFAULT_STATS para asegurar que nuevas propiedades como studyHistory existan
        return { ...DEFAULT_STATS, ...parsed, studyHistory: parsed.studyHistory || [] };
      }
    } catch (e) {
      console.error("Error al cargar stats:", e);
    }
    return DEFAULT_STATS;
  });

  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem(MODEL_KEY, modelType);
  }, [modelType]);

  useEffect(() => {
    localStorage.setItem(DIFFICULTY_KEY, difficulty);
  }, [difficulty]);

  useEffect(() => {
    localStorage.setItem(NUM_QUESTIONS_KEY, numQuestions.toString());
  }, [numQuestions]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const updateStreak = () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    setStats(prev => {
      const history = prev.studyHistory || [];
      let newStreak = prev.streak;
      const alreadyStudiedToday = history.includes(today);
      
      if (!alreadyStudiedToday) {
        if (prev.lastStudyDate === yesterday) {
          newStreak += 1;
        } else if (prev.lastStudyDate !== today) {
          // Si tiene protectores y no es hoy, el protector mantiene la racha
          if (prev.protectors > 0 && prev.lastStudyDate) {
            newStreak += 1;
            // Nota: Aquí se podría restar el protector, pero por ahora lo dejamos así 
            // para que el usuario gestione su compra en la tienda.
          } else {
            newStreak = 1;
          }
        }
      }
      
      const newHistory = alreadyStudiedToday ? history : [...history, today];
      return { 
        ...prev, 
        streak: newStreak, 
        lastStudyDate: today, 
        studyHistory: newHistory 
      };
    });
  };

  const handleGenerate = async (passageStr?: string) => {
    const targetPassage = passageStr || input;
    if (!targetPassage.trim()) return;

    setErrorMessage('');
    setStatus('loading');
    setQuizAnswers({});
    setJournalAnswers({});
    setCurrentQuizIdx(0);
    
    try {
      const result = await generateDevotional(targetPassage, modelType, numQuestions, difficulty);
      setData(result);
      setStatus('content');
      setActiveTab('study');
      updateStreak();
      const reward = (difficulty === 'hard' ? 5 : difficulty === 'medium' ? 3 : 2) * numQuestions;
      setStats(prev => ({...prev, emeralds: (prev.emeralds || 0) + reward}));
    } catch (error: any) {
      setErrorMessage(error.message);
      setStatus('error');
    }
  };

  const isModalOpen = ['store', 'calendar', 'reminders'].includes(status);
  const showContent = (status === 'content' || isModalOpen) && data !== null;
  const showReadingPlan = (status === 'viewing_plan' || isModalOpen) && planData !== null && !showContent;
  const showHome = !showContent && !showReadingPlan;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 font-sans">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[60] transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setStatus('idle'); setErrorMessage(''); setData(null); setPlanData(null); }}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h1 className="text-xl font-black hidden md:block tracking-tight text-slate-800 dark:text-slate-100">Vida Palabra</h1>
          </div>
          <div className="flex items-center gap-4">
            <GamificationHeader stats={stats} onOpenStore={() => setStatus('store')} onOpenCalendar={() => setStatus('calendar')} onOpenReminders={() => setStatus('reminders')} />
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-xl">
              {theme === 'light' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 relative z-10">
        {showHome && (
          <div className="space-y-12 animate-in fade-in duration-700 text-center">
            <div className="space-y-2">
              <h2 className="text-5xl md:text-6xl font-serif font-bold text-indigo-950 dark:text-indigo-300">Estudio Bíblico con IA</h2>
              <p className="text-slate-500 font-medium italic">"Lámpara es a mis pies tu palabra, y lumbrera a mi camino."</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col group/card">
                <div className="space-y-5 mb-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Motor de Análisis</label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <button onClick={() => setModelType('flash')} className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center ${modelType === 'flash' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
                        Flash ⚡ <span className="text-[7px] opacity-60 tracking-[0.2em]">Rápido</span>
                      </button>
                      <button onClick={() => setModelType('pro')} className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center ${modelType === 'pro' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'}`}>
                        Pro 🧠 <span className="text-[7px] opacity-60 tracking-[0.2em]">Profundo</span>
                      </button>
                      <button onClick={() => setModelType('gemma')} className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center ${modelType === 'gemma' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'}`}>
                        Gemma 💎 <span className="text-[7px] opacity-60 tracking-[0.2em]">Versátil</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Dificultad de Retos</label>
                      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map(d => (
                          <button 
                            key={d} 
                            onClick={() => setDifficulty(d)} 
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${difficulty === d ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                          >
                            {d === 'easy' ? 'Fácil' : d === 'medium' ? 'Medio' : 'Difícil'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Nº de Preguntas</label>
                      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        {[3, 5, 8].map(n => (
                          <button 
                            key={n} 
                            onClick={() => setNumQuestions(n)} 
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${numQuestions === n ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Introduce un pasaje bíblico o un tema (Ej: Salmo 23 o 'La paz de Dios')..." className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:border-indigo-500 min-h-[140px] transition-all focus:bg-white dark:focus:bg-slate-900 mb-4" />
                
                {errorMessage && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900/30 rounded-2xl text-red-700 dark:text-red-400 text-xs animate-in shake">
                    {errorMessage}
                    <p className="mt-2 opacity-70 font-bold">Asegúrate de que tu variable API_KEY tenga el formato: goo[X]-op[Y]</p>
                  </div>
                )}
                
                <Button className="mt-6 w-full py-4 text-lg" onClick={() => handleGenerate()} disabled={!input.trim() || status === 'loading'} isLoading={status === 'loading'}>
                  Generar Devocional
                </Button>
              </div>

              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-between border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                   <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-4.5-4.5 1.41-1.41L12 14.17l5.09-5.09 1.41 1.41L12 17z"/></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">📅 Planes Temáticos</h3>
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">¿Quieres un plan para varios días? Introduce un tema y te daremos una ruta de lectura.</p>
                    <input type="text" value={planTopic} onChange={(e) => setPlanTopic(e.target.value)} placeholder="Ej: Superar el miedo, Matrimonio..." className="w-full p-4 rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:ring-2 focus:ring-teal-400" />
                  </div>
                </div>
                <Button variant="secondary" className="bg-teal-400 text-slate-900 py-4 w-full mt-6" onClick={async () => {
                  setStatus('loading_plan');
                  try {
                    const p = await generateReadingPlan(planTopic, planDuration, modelType);
                    setPlanData(p);
                    setStatus('viewing_plan');
                  } catch (e: any) { setErrorMessage(e.message); setStatus('error'); }
                }} disabled={!planTopic.trim() || status === 'loading_plan'} isLoading={status === 'loading_plan'}>Crear Plan Semanal</Button>
              </div>
            </div>
          </div>
        )}

        {showContent && data && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
             <div className="text-center">
               <h2 className="text-5xl font-serif font-bold leading-tight">{data.title}</h2>
               <p className="text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-[0.2em] text-xs mt-3">{data.keyVerses?.[0] || input}</p>
            </div>
            
            <div className="flex justify-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-[1.25rem] max-w-sm mx-auto shadow-inner sticky top-20 z-40">
              {['study', 'quiz', 'journal'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-grow py-3 px-4 rounded-2xl text-[11px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md' : 'text-slate-500'}`}>{tab === 'study' ? 'Lectura' : tab === 'quiz' ? 'Retos' : 'Diario'}</button>
              ))}
            </div>

            <div className="min-h-[500px]">
              {activeTab === 'study' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] italic font-serif text-2xl text-center shadow-lg border border-slate-100 dark:border-slate-800 leading-relaxed group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 opacity-20"></div>
                    "{data.passageText}"
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-200 transition-colors">
                      <h4 className="font-black text-[10px] text-indigo-500 uppercase mb-4 tracking-[0.2em]">Explicación Teológica</h4>
                      <p className="leading-relaxed text-slate-600 dark:text-slate-300">{data.summary}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-teal-200 transition-colors">
                      <h4 className="font-black text-[10px] text-teal-500 uppercase mb-4 tracking-[0.2em]">Contexto Histórico</h4>
                      <p className="leading-relaxed text-slate-600 dark:text-slate-300">{data.historicalContext}</p>
                    </div>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
                     <h4 className="font-black text-[10px] text-indigo-600 dark:text-indigo-400 uppercase mb-4 tracking-[0.2em]">Aplicación Práctica</h4>
                     <p className="leading-relaxed font-medium">{data.practicalApplication}</p>
                  </div>
                  <DailyGuide plan={data.dailyPlan} />
                </div>
              )}
              {/* Fixed: Changed currentQuizIdx prop to currentIdx to match QuizProps interface */}
              {activeTab === 'quiz' && <Quiz questions={data.quiz} answers={quizAnswers} currentIdx={currentQuizIdx} setCurrentIdx={setCurrentQuizIdx} onAnswerChange={(idx, val) => setQuizAnswers(prev => ({...prev, [idx]: val}))} />}
              {activeTab === 'journal' && <Journal prompts={data.reflectionPrompts} devotionalData={data} quizAnswers={quizAnswers} journalAnswers={journalAnswers} onJournalChange={(idx, val) => setJournalAnswers(prev => ({...prev, [idx]: val}))} />}
            </div>
          </div>
        )}

        {showReadingPlan && planData && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <ReadingPlanView plan={planData} onSelectPassage={(p) => { setInput(p); handleGenerate(p); }} />
            <Button onClick={() => setStatus('idle')} variant="outline" className="mx-auto mt-8 px-10">Volver al Inicio</Button>
          </div>
        )}
      </main>

      {status === 'store' && <Store stats={stats} onClose={() => setStatus(data ? 'content' : 'idle')} onBuyProtector={() => { if (stats.emeralds >= 50) setStats(prev => ({...prev, emeralds: (prev.emeralds || 0) - 50, protectors: (prev.protectors || 0) + 1})); }} />}
      {status === 'calendar' && <StreakCalendar stats={stats} onClose={() => setStatus(data ? 'content' : 'idle')} />}
      {status === 'reminders' && <ReminderSettings stats={stats} onClose={() => setStatus(data ? 'content' : 'idle')} onSetReminder={(time) => setStats(prev => ({...prev, reminderTime: time}))} />}

      <footer className="mt-20 py-10 border-t border-slate-200 dark:border-slate-800 text-center text-slate-400 relative z-10">
        <p className="text-sm font-bold tracking-widest uppercase">Vida en la Palabra © 2025</p>
        <p className="text-[10px] mt-2 opacity-60">Utilizando Sistema de LLaves Macabro (Híbrido Gemini/Gemma) en el cliente.</p>
      </footer>
    </div>
  );
};

export default App;
