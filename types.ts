
export type QuizQuestionType = 
  | 'multiple-choice' 
  | 'multiple-selection' 
  | 'matching' 
  | 'ordering' 
  | 'fill-in-the-blanks' 
  | 'open-ended';

export interface QuizQuestion {
  type: QuizQuestionType;
  question: string;
  explanation: string;
  options?: string[];
  correctIndex?: number;
  correctIndices?: number[];
  pairs?: { left: string; right: string }[];
  orderedItems?: string[];
  textWithBlanks?: string;
  blankAnswers?: string[];
}

export interface DailyPlanDay {
  day: number;
  focus: string;
  verse: string;
  action: string;
}

export type PlanDuration = 'intensive' | 'weekly' | 'monthly' | 'annual';

export interface ReadingPlanItem {
  id: string; 
  passage: string;
  theme: string;
  reason: string;
}

export interface ReadingPlan {
  title: string;
  description: string;
  duration: PlanDuration;
  items: ReadingPlanItem[];
}

export interface DevotionalData {
  title: string;
  passageText: string;
  summary: string;
  historicalContext: string;
  keyVerses: string[];
  quiz: QuizQuestion[];
  reflectionPrompts: string[];
  practicalApplication: string;
  dailyPlan: DailyPlanDay[];
}

export interface HistoryItem {
  id: string;
  title: string;
  passage: string;
  timestamp: number;
}

export interface FavoriteItem {
  id: string;
  title: string;
  passage: string;
}

export interface UserStats {
  streak: number;
  lastStudyDate: string | null; // ISO Date YYYY-MM-DD
  emeralds: number;
  protectors: number;
}

export type AppStatus = 'idle' | 'loading' | 'content' | 'error' | 'viewing_plan' | 'loading_plan' | 'viewing_history' | 'viewing_favorites' | 'store';
