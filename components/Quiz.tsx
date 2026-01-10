
import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { Button } from './Button';

interface QuizProps {
  questions: QuizQuestion[];
  onAnswerChange?: (idx: number, answer: string) => void;
  answers?: Record<number, string>;
  currentIdx: number;
  setCurrentIdx: (idx: number) => void;
}

const PAIR_COLORS = [
  'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300',
  'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
  'border-amber-500 bg-amber-50/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  'border-rose-500 bg-rose-50/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300',
  'border-violet-500 bg-violet-50/50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300',
  'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300',
];

export const Quiz: React.FC<QuizProps> = ({ 
  questions, 
  onAnswerChange, 
  answers = {}, 
  currentIdx, 
  setCurrentIdx 
}) => {
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [matchingState, setMatchingState] = useState<{left: string|null, paired: Record<string, string>}>({ left: null, paired: {} });
  const [orderState, setOrderState] = useState<string[]>([]);
  const [blankStates, setBlankStates] = useState<string[]>([]);
  const [shuffledRights, setShuffledRights] = useState<string[]>([]);

  const q = questions[currentIdx];

  const BLANK_REGEX = /\[\s*blank\s*\]|\[\s*_+\s*\]|(?<!\w)_+(?!\w)/gi;

  useEffect(() => {
    if (!q) return;
    setIsAnswered(false);
    setSelectedIndices([]);
    setShuffledRights([]); // Resetear siempre al cambiar de pregunta
    
    if (q.type === 'ordering' && q.orderedItems) {
      setOrderState([...q.orderedItems].sort(() => Math.random() - 0.5));
    } else if (q.type === 'matching') {
      setMatchingState({ left: null, paired: {} });
      if (q.pairs && q.pairs.length > 0) {
        const rights = q.pairs.map(p => p.right);
        setShuffledRights([...rights].sort(() => Math.random() - 0.5));
      }
    } else if (q.type === 'fill-in-the-blanks') {
      const content = q.textWithBlanks || q.question || "";
      const blanksInText = content.match(BLANK_REGEX)?.length || 0;
      const count = Math.max(blanksInText, q.blankAnswers?.length || 0);
      setBlankStates(new Array(count).fill(''));
    }
  }, [currentIdx, q]);

  if (!q) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 text-center">
        <p className="text-slate-500">No hay retos disponibles.</p>
        <Button onClick={() => setShowResults(true)} className="mt-4">Ver Resumen</Button>
      </div>
    );
  }

  // Validación de datos corruptos de la IA
  const isBrokenMatching = q.type === 'matching' && (!q.pairs || q.pairs.length === 0);
  const isBrokenChoice = (q.type === 'multiple-choice' || q.type === 'multiple-selection') && (!q.options || q.options.length === 0);

  if (isBrokenMatching || isBrokenChoice) {
    return (
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
        <p className="text-slate-500 mb-6 font-medium italic">Este reto no pudo ser cargado correctamente por la IA.</p>
        <Button onClick={() => currentIdx + 1 < questions.length ? setCurrentIdx(currentIdx + 1) : setShowResults(true)} variant="outline" className="mx-auto">Saltar Reto</Button>
      </div>
    );
  }

  const handleConfirm = () => {
    let isCorrect = false;
    let answerText = "";

    if (q.type === 'multiple-choice') {
      isCorrect = selectedIndices[0] === q.correctIndex;
      answerText = q.options ? q.options[selectedIndices[0]] : "";
    } else if (q.type === 'multiple-selection') {
      const sortedSelected = [...selectedIndices].sort();
      const sortedCorrect = [...(q.correctIndices || [])].sort();
      isCorrect = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
      answerText = selectedIndices.map(i => q.options?.[i]).join(', ');
    } else if (q.type === 'ordering') {
      isCorrect = JSON.stringify(orderState) === JSON.stringify(q.orderedItems);
      answerText = orderState.join(' -> ');
    } else if (q.type === 'matching') {
      const allCorrect = q.pairs?.every(p => matchingState.paired[p.left] === p.right);
      isCorrect = !!allCorrect;
      answerText = Object.entries(matchingState.paired).map(([l, r]) => `${l} = ${r}`).join(', ');
    } else if (q.type === 'fill-in-the-blanks') {
      isCorrect = blankStates.every((val, i) => {
        const correct = q.blankAnswers?.[i] || "";
        return val.toLowerCase().trim() === correct.toLowerCase().trim();
      });
      answerText = blankStates.join(', ');
    } else if (q.type === 'open-ended') {
      isCorrect = true; 
      answerText = answers[currentIdx] || "";
    }

    if (isCorrect) setScore(score + 1);
    if (onAnswerChange) onAnswerChange(currentIdx, answerText);
    setIsAnswered(true);
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setShowResults(true);
    }
  };

  const isConfirmDisabled = () => {
    if (isAnswered) return true;
    switch (q.type) {
      case 'multiple-choice': return selectedIndices.length === 0;
      case 'multiple-selection': return selectedIndices.length === 0;
      case 'matching': return Object.keys(matchingState.paired).length < (q.pairs?.length || 0);
      case 'fill-in-the-blanks': return blankStates.some(b => !b.trim());
      case 'open-ended': return !answers[currentIdx]?.trim();
      default: return false;
    }
  };

  const getPairStyle = (leftText: string) => {
    const pairIndex = q.pairs?.findIndex(p => p.left === leftText) ?? -1;
    if (pairIndex === -1) return undefined;
    return {
        className: PAIR_COLORS[pairIndex % PAIR_COLORS.length],
        num: pairIndex + 1
    };
  };

  const getLeftPartner = (rightText: string) => {
    return Object.keys(matchingState.paired).find(key => matchingState.paired[key] === rightText);
  };

  if (showResults) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-center border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-500">
        <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">¡Misión cumplida!</h3>
        <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400 my-8">{score} / {questions.length}</p>
        <Button className="w-full h-14" onClick={() => { setCurrentIdx(0); setScore(0); setShowResults(false); }}>Reiniciar Retos</Button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 transition-all relative overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded-full uppercase tracking-tighter">
          {q.type.replace(/-/g, ' ')}
        </span>
        <p className="text-xs text-slate-400 font-bold">Reto {currentIdx + 1} de {questions.length}</p>
      </div>

      <h3 className="text-2xl font-serif text-slate-800 dark:text-slate-100 mb-10 leading-snug">
        {q.type === 'fill-in-the-blanks' ? "Completa el siguiente texto:" : q.question}
      </h3>

      <div className="mb-10 min-h-[160px]">
        {q.type === 'matching' && q.pairs && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Columna A</p>
              {q.pairs.map((p, i) => {
                const isPaired = !!matchingState.paired[p.left];
                const isSelected = matchingState.left === p.left;
                const pairInfo = getPairStyle(p.left);
                return (
                  <button key={i} disabled={isAnswered || isPaired} onClick={() => setMatchingState(prev => ({ ...prev, left: p.left }))} className={`w-full p-4 rounded-xl text-left border-2 transition-all flex items-center justify-between text-sm ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' : (isPaired && pairInfo) ? `${pairInfo.className}` : 'bg-slate-50 dark:bg-slate-800 border-transparent'}`}>
                    <span>{p.left}</span>
                    {(isPaired && pairInfo) && <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/50 text-[10px] font-black">{pairInfo.num}</span>}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Columna B</p>
              {shuffledRights.map((rightText, i) => {
                const partnerLeft = getLeftPartner(rightText);
                const isPaired = !!partnerLeft;
                const pairInfo = partnerLeft ? getPairStyle(partnerLeft) : undefined;
                return (
                  <button key={i} disabled={isAnswered || !matchingState.left || isPaired} onClick={() => { if (matchingState.left) setMatchingState(prev => ({ paired: { ...prev.paired, [prev.left!]: rightText }, left: null })); }} className={`w-full p-4 rounded-xl text-left border-2 transition-all flex items-center justify-between text-sm ${(isPaired && pairInfo) ? `${pairInfo.className}` : matchingState.left ? 'border-dashed border-indigo-300' : 'bg-slate-50 dark:bg-slate-800 border-transparent'}`}>
                    <span>{rightText}</span>
                    {(isPaired && pairInfo) && <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/50 text-[10px] font-black">{pairInfo.num}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {q.type === 'fill-in-the-blanks' && (
          <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl text-lg leading-loose border border-slate-100 dark:border-slate-700">
            {(q.textWithBlanks || q.question || "").split(BLANK_REGEX).map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && (
                  <input 
                    type="text" 
                    disabled={isAnswered} 
                    value={blankStates[i] || ""} 
                    onChange={(e) => { const newB = [...blankStates]; newB[i] = e.target.value; setBlankStates(newB); }} 
                    placeholder="..."
                    className={`mx-2 px-3 py-1 w-36 bg-white dark:bg-slate-700 border-b-4 outline-none transition-all text-center rounded-lg font-bold placeholder:opacity-30 ${isAnswered ? (blankStates[i]?.toLowerCase().trim() === (q.blankAnswers?.[i] || "").toLowerCase().trim() ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-rose-500 bg-rose-50 dark:bg-rose-900/20') : 'border-indigo-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'}`} 
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {q.type === 'open-ended' && (
          <textarea disabled={isAnswered} value={answers[currentIdx] || ""} onChange={(e) => onAnswerChange?.(currentIdx, e.target.value)} className="w-full h-40 p-6 rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 outline-none transition-all resize-none shadow-inner" placeholder="Escribe tu reflexión..." />
        )}

        {(q.type === 'multiple-choice' || q.type === 'multiple-selection') && q.options?.map((opt, idx) => (
          <button key={idx} disabled={isAnswered} onClick={() => { if (q.type === 'multiple-choice') setSelectedIndices([idx]); else setSelectedIndices(prev => selectedIndices.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]); }} className={`w-full mb-3 text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${selectedIndices.includes(idx) ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-transparent bg-slate-50 dark:bg-slate-800'}`}>
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${selectedIndices.includes(idx) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>{String.fromCharCode(65 + idx)}</span>
            <span className="font-semibold text-sm">{opt}</span>
          </button>
        ))}
      </div>

      {isAnswered && (
        <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 animate-in fade-in slide-in-from-top-4 duration-500">
          <p className="text-indigo-900 dark:text-indigo-300 text-sm leading-relaxed"><span className="font-black uppercase text-[10px] block mb-1 opacity-60">Sabiduría:</span> {q.explanation}</p>
        </div>
      )}

      <div className="flex gap-4 mt-6">
        {!isAnswered ? (
          <Button className="w-full h-14" onClick={handleConfirm} disabled={isConfirmDisabled()}>Confirmar Reto</Button>
        ) : (
          <Button className="w-full h-14" variant="secondary" onClick={handleNext}>{currentIdx + 1 < questions.length ? "Siguiente Reto" : "Resultados"}</Button>
        )}
      </div>
    </div>
  );
};
