
import React, { useState, useEffect } from 'react';
import { generateDevotional, generateReadingPlan, BibleSearchParams } from './services/geminiService';
import { BIBLE_BOOKS_DATA } from './services/bibleMetadata';
import { AppStatus, DevotionalData, ReadingPlan, PlanDuration, UserStats, ModelType, QuizDifficulty } from './types';
import { Button } from './components/Button';
import { Quiz } from './components/Quiz';
import { Journal } from './components/Journal';
import { ReadingPlanView } from './components/ReadingPlanView';
import { DailyGuide } from './components/DailyGuide';
import { GamificationHeader, Store, StreakCalendar, ReminderSettings } from './components/Gamification';
import { saveReadingPlan, listReadingPlans, getReadingPlan, deleteReadingPlan } from './services/planDb';

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
  
  // Nuevos estados para selección bíblica
  const [searchMode, setSearchMode] = useState<'passage' | 'topic'>('passage');
  const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS_DATA[0].name);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verseStart, setVerseStart] = useState<string>('');
  const [verseEnd, setVerseEnd] = useState<string>('');

  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [data, setData] = useState<DevotionalData | null>(null);
  const [planData, setPlanData] = useState<ReadingPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'study' | 'quiz' | 'journal'>('study');
  const [planTopic, setPlanTopic] = useState('');
  const [planDuration, setPlanDuration] = useState<PlanDuration>('weekly');
  const [savedPlans, setSavedPlans] = useState<Array<{id:string; title:string; duration:PlanDuration; topic:string; created_at:string}>>([]);
  
  const [difficulty, setDifficulty] = useState<QuizDifficulty>(() => (localStorage.getItem(DIFFICULTY_KEY) as QuizDifficulty) || 'medium');
  const [numQuestions, setNumQuestions] = useState<number>(() => Number(localStorage.getItem(NUM_QUESTIONS_KEY)) || 5);
  const [modelType, setModelType] = useState<ModelType>(() => (localStorage.getItem(MODEL_KEY) as ModelType) || 'flash');
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system');
  
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [journalAnswers, setJournalAnswers] = useState<Record<number, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);

  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STATS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migración: Si el historial es de strings (versión anterior), convertirlo
        let history = parsed.studyHistory || [];
        if (history.length > 0 && typeof history[0] === 'string') {
            history = history.map((date: string) => ({ date, passage: 'Estudio previo' }));
        }
        
        // Mezclamos con DEFAULT_STATS para asegurar que nuevas propiedades existan
        return { ...DEFAULT_STATS, ...parsed, studyHistory: history };
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
    // Determinar el pasaje objetivo y los parámetros
    let targetPassage = passageStr || input;
    let searchParams: BibleSearchParams | undefined;

    if (!passageStr && searchMode === 'passage') {
       targetPassage = `${selectedBook} ${selectedChapter}${verseStart ? `:${verseStart}` : ''}${verseEnd ? `-${verseEnd}` : ''}`;
       searchParams = {
         book: selectedBook,
         chapter: selectedChapter,
         verseStart: verseStart ? parseInt(verseStart) : undefined,
         verseEnd: verseEnd ? parseInt(verseEnd) : undefined
       };
    }

    if (!targetPassage.trim()) return;

    setErrorMessage('');
    setStatus('loading');
    setQuizAnswers({});
    setJournalAnswers({});
    setCurrentQuizIdx(0);
    
    try {
      const result = await generateDevotional(targetPassage, modelType, numQuestions, difficulty, searchParams);
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

  const isModalOpen = ['store', 'calendar', 'reminders', 'plans'].includes(status);
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

                <div className="mb-6">
                  <div className="flex gap-2 mb-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                    <button 
                      onClick={() => setSearchMode('passage')}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${searchMode === 'passage' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                    >
                      📖 Pasaje
                    </button>
                    <button 
                      onClick={() => setSearchMode('topic')}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${searchMode === 'topic' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                    >
                      💡 Tema
                    </button>
                  </div>

                  {searchMode === 'passage' ? (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Libro</label>
                        <select 
                          value={selectedBook} 
                          onChange={(e) => {
                             setSelectedBook(e.target.value);
                             setSelectedChapter(1); // Resetear capítulo
                             setVerseStart('');
                             setVerseEnd('');
                          }}
                          className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-sm font-bold cursor-pointer"
                        >
                          {BIBLE_BOOKS_DATA.map(book => (
                            <option key={book.name} value={book.name}>{book.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Capítulo</label>
                          <select 
                            value={selectedChapter} 
                            onChange={(e) => setSelectedChapter(Number(e.target.value))}
                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-sm font-bold cursor-pointer"
                          >
                            {Array.from({length: BIBLE_BOOKS_DATA.find(b => b.name === selectedBook)?.chapters || 1}, (_, i) => i + 1).map(num => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex-[1.5]">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Versículos (Opcional)</label>
                           <div className="flex items-center gap-2">
                             <input 
                               type="number" 
                               placeholder="1" 
                               min="1"
                               value={verseStart} 
                               onChange={(e) => setVerseStart(e.target.value)}
                               className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-sm font-bold text-center"
                             />
                             <span className="text-slate-400 font-bold">-</span>
                             <input 
                               type="number" 
                               placeholder="Fin" 
                               min="1"
                               value={verseEnd} 
                               onChange={(e) => setVerseEnd(e.target.value)}
                               className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-sm font-bold text-center"
                             />
                           </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Introduce un tema (Ej: 'La paz de Dios' o 'Ansiedad')..." className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:border-indigo-500 min-h-[140px] transition-all focus:bg-white dark:focus:bg-slate-900" />
                  )}
                </div>
                
                {errorMessage && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900/30 rounded-2xl text-red-700 dark:text-red-400 text-xs animate-in shake">
                    {errorMessage}
                    <p className="mt-2 opacity-70 font-bold">Asegúrate de que tu variable API_KEY tenga el formato: goo[X]-op[Y]</p>
                  </div>
                )}
                
                <Button 
                  className="mt-6 w-full py-4 text-lg" 
                  onClick={() => handleGenerate()} 
                  disabled={status === 'loading' || (searchMode === 'topic' && !input.trim())} 
                  isLoading={status === 'loading'}
                >
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
                    <div className="grid grid-cols-2 gap-2">
                      {(['intensive','weekly','monthly','annual'] as PlanDuration[]).map(d => (
                        <button key={d} onClick={() => setPlanDuration(d)} className={`py-2 rounded-xl text-[10px] font-black uppercase ${planDuration === d ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'}`}>
                          {d === 'intensive' ? 'Intensivo' : d === 'weekly' ? 'Semanal' : d === 'monthly' ? 'Mensual' : 'Anual'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="secondary" className="bg-teal-400 text-slate-900 py-4 w-full mt-6" onClick={async () => {
                  setStatus('loading_plan');
                  try {
                    const p = await generateReadingPlan(planTopic, planDuration, modelType);
                    setPlanData(p);
                    setStatus('viewing_plan');
                  } catch (e: any) { setErrorMessage(e.message); setStatus('error'); }
                }} disabled={!planTopic.trim() || status === 'loading_plan'} isLoading={status === 'loading_plan'}>Crear Plan</Button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="bg-white/10 text-white border-white/20" onClick={async () => { const list = await listReadingPlans(); setSavedPlans(list as any); setStatus('plans'); }}>Mis Planes</Button>
                  <Button variant="outline" className="bg-white/10 text-white border-white/20" onClick={() => { if (planData) saveReadingPlan(planData, planTopic).then(() => {}); }}>Guardar Actual</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showContent && data && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                     <div className="text-center">
                       {duplicateWarning && (
                         <div className="mb-6 mx-auto max-w-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 flex items-center gap-3 text-amber-800 dark:text-amber-200 shadow-sm animate-pulse">
                           <span className="text-xl">⚠️</span>
                           <p className="text-xs font-bold uppercase tracking-wide">{duplicateWarning}</p>
                         </div>
                       )}
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
      {status === 'plans' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setStatus('idle')}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[85vh] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-y-auto animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black uppercase tracking-widest">Mis Planes</h3>
                <button onClick={() => setStatus('idle')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">✖</button>
              </div>
              {savedPlans.length === 0 ? (
                <p className="text-sm text-slate-500">No tienes planes guardados.</p>
              ) : (
                <div className="space-y-3">
                  {savedPlans.map(sp => (
                    <div key={sp.id} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{sp.title}</p>
                        <p className="text-[10px] uppercase text-slate-500">Tema: {sp.topic} · {sp.duration}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={async () => { const p = await getReadingPlan(sp.id); if (p) { setPlanData(p); setStatus('viewing_plan'); } }}>Abrir</Button>
                        <Button variant="outline" onClick={async () => { await deleteReadingPlan(sp.id); const list = await listReadingPlans(); setSavedPlans(list as any); }}>Eliminar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="mt-20 py-10 border-t border-slate-200 dark:border-slate-800 text-center text-slate-400 relative z-10">
        <p className="text-sm font-bold tracking-widest uppercase">Vida en la Palabra © 2025</p>
        <p className="text-[10px] mt-2 opacity-60">Utilizando Sistema de LLaves Macabro (Híbrido Gemini/Gemma) en el cliente.</p>
      </footer>
    </div>
  );
};

export default App;
