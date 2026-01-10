
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
  const [matchingState, setMatchingState] = useState<{left: string|null, right: string|null, paired: Record<string, string>}>({ left: null, right: null, paired: {} });
  const [orderState, setOrderState] = useState<string[]>([]);
  const [blankStates, setBlankStates] = useState<string[]>([]);

  const q = questions[currentIdx] || questions[0];

  useEffect(() => {
    setIsAnswered(false);
    setSelectedIndices([]);
    if (q.type === 'ordering' && q.orderedItems) {
      setOrderState([...q.orderedItems].sort(() => Math.random() - 0.5));
    } else if (q.type === 'matching') {
      setMatchingState({ left: null, right: null, paired: {} });
    } else if (q.type === 'fill-in-the-blanks' && q.blankAnswers) {
      setBlankStates(new Array(q.blankAnswers.length).fill(''));
    }
  }, [currentIdx, q]);

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
      answerText = Object.entries(matchingState.paired).map(([l, r]) => `${l}:${r}`).join(', ');
    } else if (q.type === 'fill-in-the-blanks') {
      isCorrect = blankStates.every((val, i) => val.toLowerCase().trim() === q.blankAnswers?.[i]?.toLowerCase().trim());
      answerText = blankStates.join(', ');
    } else if (q.type === 'open-ended') {
      isCorrect = true; 
      answerText = answers[currentIdx] || "";
    }

    if (isCorrect) setScore(score + 1);
    if (onAnswerChange) onAnswerChange(currentIdx, answerText);
    setIsAnswered(true);
  };

  const handleSkip = () => {
    if (onAnswerChange) onAnswerChange(currentIdx, "(Saltado)");
    handleNext();
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
      case 'multiple-choice':
      case 'multiple-selection': return selectedIndices.length === 0;
      case 'matching': return Object.keys(matchingState.paired).length < (q.pairs?.length || 0);
      case 'fill-in-the-blanks': return blankStates.some(b => !b.trim());
      case 'open-ended': return !answers[currentIdx]?.trim();
      default: return false;
    }
  };

  if (showResults) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-center border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-500">
        <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">¡Misión cumplida!</h3>
        <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400 my-8">{score} / {questions.length}</p>
        <Button className="w-full" onClick={() => { setCurrentIdx(0); setScore(0); setShowResults(false); }}>Reiniciar</Button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 transition-all">
      <div className="flex justify-between items-center mb-8">
        <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded-full uppercase tracking-tighter">
          {q.type.replace(/-/g, ' ')}
        </span>
        <p className="text-xs text-slate-400 font-bold">Pregunta {currentIdx + 1} de {questions.length}</p>
      </div>

      <h3 className="text-2xl font-serif text-slate-800 dark:text-slate-100 mb-10">{q.question}</h3>

      <div className="space-y-4 mb-10">
        {q.type === 'fill-in-the-blanks' && (
          <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl text-lg leading-loose">
            {q.textWithBlanks?.split(/(\[___\])/g).map((part, i) => {
              if (part === '[___]') {
                const blankIndex = Math.floor(i / 2);
                return (
                  <input 
                    key={i}
                    type="text" 
                    disabled={isAnswered}
                    value={blankStates[blankIndex] || ""}
                    placeholder="..."
                    onChange={(e) => {
                      const newBlanks = [...blankStates];
                      newBlanks[blankIndex] = e.target.value;
                      setBlankStates(newBlanks);
                    }}
                    className={`mx-2 px-3 py-1 w-32 bg-white dark:bg-slate-700 border-b-2 outline-none transition-all text-center rounded-lg font-bold text-indigo-600 dark:text-indigo-400 ${isAnswered ? (blankStates[blankIndex]?.toLowerCase().trim() === q.blankAnswers?.[blankIndex]?.toLowerCase().trim() ? 'border-green-500' : 'border-red-500') : 'border-indigo-200 focus:border-indigo-500'}`}
                  />
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        )}

        {q.type === 'open-ended' && (
          <textarea 
            disabled={isAnswered}
            value={answers[currentIdx] || ""}
            onChange={(e) => onAnswerChange?.(currentIdx, e.target.value)}
            className="w-full h-40 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100 transition-all"
            placeholder="Escribe tu respuesta aquí..."
          />
        )}

        {(q.type === 'multiple-choice' || q.type === 'multiple-selection') && q.options?.map((opt, idx) => (
          <button 
            key={idx} 
            disabled={isAnswered} 
            onClick={() => {
              if (q.type === 'multiple-choice') setSelectedIndices([idx]);
              else setSelectedIndices(prev => selectedIndices.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
            }}
            className={`w-full text-left p-5 rounded-3xl border-2 transition-all flex items-center gap-4 ${selectedIndices.includes(idx) ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-transparent bg-slate-50 dark:bg-slate-800'}`}
          >
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${selectedIndices.includes(idx) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="font-semibold">{opt}</span>
          </button>
        ))}
      </div>

      {isAnswered && (
        <div className="mb-10 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
          <p className="text-indigo-900 dark:text-indigo-300 text-sm">{q.explanation}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        {!isAnswered ? (
          <>
            <Button className="flex-grow h-16 rounded-[1.5rem]" onClick={handleConfirm} disabled={isConfirmDisabled()}>Confirmar</Button>
            <Button className="h-16 rounded-[1.5rem] px-8" variant="outline" onClick={handleSkip}>Saltar</Button>
          </>
        ) : (
          <Button className="w-full h-16 rounded-[1.5rem]" variant="secondary" onClick={handleNext}>
            {currentIdx + 1 < questions.length ? "Siguiente" : "Resultados"}
          </Button>
        )}
      </div>
    </div>
  );
};
