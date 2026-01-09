
import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { Button } from './Button';

interface QuizProps {
  questions: QuizQuestion[];
  onAnswerChange?: (idx: number, answer: string) => void;
  answers?: Record<number, string>;
}

export const Quiz: React.FC<QuizProps> = ({ questions, onAnswerChange, answers = {} }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Estados locales para interacciones complejas
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [matchingState, setMatchingState] = useState<{left: string|null, right: string|null, paired: Record<string, string>}>({ left: null, right: null, paired: {} });
  const [orderState, setOrderState] = useState<string[]>([]);
  const [blankStates, setBlankStates] = useState<string[]>([]);

  const q = questions[currentIdx];

  // Sincronizar estados cuando cambia la pregunta
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
      isCorrect = blankStates.every((val, i) => val.toLowerCase().trim() === q.blankAnswers?.[i].toLowerCase().trim());
      answerText = blankStates.join(', ');
    } else if (q.type === 'open-ended') {
      isCorrect = true; // Subjetivo
      answerText = answers[currentIdx] || "";
    }

    if (isCorrect) setScore(score + 1);
    if (onAnswerChange) onAnswerChange(currentIdx, answerText);
    setIsAnswered(true);
  };

  const moveItem = (from: number, to: number) => {
    const newOrder = [...orderState];
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);
    setOrderState(newOrder);
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setShowResults(true);
    }
  };

  const isConfirmDisabled = () => {
    switch (q.type) {
      case 'multiple-choice':
      case 'multiple-selection':
        return selectedIndices.length === 0;
      case 'matching':
        return Object.keys(matchingState.paired).length < (q.pairs?.length || 0);
      case 'ordering':
        return false; // Siempre tiene un orden inicial
      case 'fill-in-the-blanks':
        return blankStates.some(b => !b.trim());
      case 'open-ended':
        return !answers[currentIdx]?.trim();
      default:
        return false;
    }
  };

  if (showResults) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-center border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">¡Misión cumplida!</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Has profundizado con éxito en este pasaje.</p>
        <div className="inline-block bg-slate-50 dark:bg-slate-800/50 px-8 py-4 rounded-3xl border border-slate-100 dark:border-slate-800 mb-8 transition-colors">
          <p className="text-sm text-slate-400 uppercase tracking-widest font-bold">Puntuación Final</p>
          <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400">{score} <span className="text-2xl text-slate-300">/ {questions.length}</span></p>
        </div>
        <Button className="w-full" onClick={() => { setCurrentIdx(0); setScore(0); setShowResults(false); }}>Reiniciar Desafío</Button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 transition-all">
      {/* Header del Cuestionario */}
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-1">
          <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded-full uppercase tracking-tighter">
            {q.type.replace(/-/g, ' ')}
          </span>
          <p className="text-xs text-slate-400 font-bold">Pregunta {currentIdx + 1} de {questions.length}</p>
        </div>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 w-4 rounded-full transition-all ${i === currentIdx ? 'bg-indigo-600 w-8' : i < currentIdx ? 'bg-indigo-300' : 'bg-slate-200 dark:bg-slate-800'}`} />
          ))}
        </div>
      </div>

      <h3 className="text-2xl font-serif text-slate-800 dark:text-slate-100 mb-10 leading-snug transition-colors">{q.question}</h3>

      {/* RENDERIZADO SEGÚN TIPO */}
      <div className="space-y-4 mb-10">
        
        {/* SELECCIÓN ÚNICA O MÚLTIPLE */}
        {(q.type === 'multiple-choice' || q.type === 'multiple-selection') && q.options?.map((opt, idx) => {
          const isSelected = selectedIndices.includes(idx);
          const isCorrect = q.type === 'multiple-choice' ? idx === q.correctIndex : q.correctIndices?.includes(idx);
          
          let btnClass = "w-full text-left p-5 rounded-3xl border-2 transition-all flex items-center gap-4 group ";
          if (isAnswered) {
            if (isCorrect) btnClass += "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400";
            else if (isSelected) btnClass += "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400";
            else btnClass += "opacity-50 border-slate-100 dark:border-slate-800";
          } else {
            btnClass += isSelected 
              ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-4 ring-indigo-50 dark:ring-indigo-900/20" 
              : "bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700";
          }

          return (
            <button key={idx} disabled={isAnswered} onClick={() => {
              if (q.type === 'multiple-choice') setSelectedIndices([idx]);
              else setSelectedIndices(prev => isSelected ? prev.filter(i => i !== idx) : [...prev, idx]);
            }} className={btnClass}>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="font-semibold">{opt}</span>
            </button>
          );
        })}

        {/* ORDENAMIENTO */}
        {q.type === 'ordering' && (
          <div className="space-y-2">
            {orderState.map((item, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{item}</span>
                {!isAnswered && (
                  <div className="flex gap-1">
                    <button onClick={() => moveItem(idx, idx - 1)} disabled={idx === 0} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-all disabled:opacity-0">↑</button>
                    <button onClick={() => moveItem(idx, idx + 1)} disabled={idx === orderState.length - 1} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-all disabled:opacity-0">↓</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* EMPAREJAMIENTO */}
        {q.type === 'matching' && q.pairs && (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Columna A</p>
              {q.pairs.map((p, i) => (
                <button 
                  key={i} 
                  disabled={isAnswered || !!matchingState.paired[p.left]}
                  onClick={() => setMatchingState(prev => ({ ...prev, left: p.left }))}
                  className={`w-full p-4 rounded-2xl text-left border-2 text-sm transition-all ${matchingState.left === p.left ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : matchingState.paired[p.left] ? 'border-green-100 bg-green-50/20 dark:bg-green-900/10 opacity-50' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-slate-200'}`}
                >
                  {p.left}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Columna B</p>
              {q.pairs.map((p, i) => {
                const rightItem = q.pairs?.[i].right || ""; 
                const isPaired = Object.values(matchingState.paired).includes(rightItem);
                return (
                  <button 
                    key={i} 
                    disabled={isAnswered || !matchingState.left || isPaired}
                    onClick={() => {
                      if (matchingState.left) {
                        setMatchingState(prev => ({ 
                          ...prev, 
                          paired: { ...prev.paired, [prev.left!]: rightItem },
                          left: null 
                        }));
                      }
                    }}
                    className={`w-full p-4 rounded-2xl text-left border-2 text-sm transition-all ${isPaired ? 'border-green-100 bg-green-50/20 dark:bg-green-900/10 opacity-50' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-slate-200'}`}
                  >
                    {rightItem}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* COMPLETAR ESPACIOS */}
        {q.type === 'fill-in-the-blanks' && (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl text-lg leading-loose transition-colors">
            {q.textWithBlanks?.split(/\[___\]/).map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && (
                  <input 
                    type="text" 
                    disabled={isAnswered}
                    value={blankStates[i] || ""}
                    placeholder="..."
                    onChange={(e) => {
                      const newBlanks = [...blankStates];
                      newBlanks[i] = e.target.value;
                      setBlankStates(newBlanks);
                    }}
                    className={`mx-2 px-3 py-1 w-32 bg-white dark:bg-slate-700 border-b-2 outline-none transition-all text-center rounded-lg font-bold text-indigo-600 dark:text-indigo-400 ${isAnswered ? (blankStates[i]?.toLowerCase().trim() === q.blankAnswers?.[i].toLowerCase().trim() ? 'border-green-500' : 'border-red-500') : 'border-indigo-200 focus:border-indigo-500'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* REFLEXIÓN ABIERTA */}
        {q.type === 'open-ended' && (
          <div className="space-y-2">
            <textarea 
              disabled={isAnswered}
              value={answers[currentIdx] || ""}
              onChange={(e) => onAnswerChange?.(currentIdx, e.target.value)}
              className="w-full h-40 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 outline-none transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              placeholder="Tus pensamientos aquí..."
            />
            {!isAnswered && !answers[currentIdx]?.trim() && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium italic animate-pulse">
                * Se requiere una reflexión escrita para continuar.
              </p>
            )}
          </div>
        )}
      </div>

      {isAnswered && (
        <div className="mb-10 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 animate-in slide-in-from-top-2 duration-300 transition-all">
          <p className="text-indigo-900 dark:text-indigo-300 text-sm leading-relaxed transition-colors">
            <span className="font-black uppercase tracking-widest text-[10px] block mb-2 opacity-60">Sabiduría adicional:</span>
            {q.explanation}
          </p>
        </div>
      )}

      {!isAnswered ? (
        <Button 
          className="w-full h-16 rounded-[1.5rem]" 
          onClick={handleConfirm}
          disabled={isConfirmDisabled()}
        >
          Confirmar Respuesta
        </Button>
      ) : (
        <Button className="w-full h-16 rounded-[1.5rem]" variant="secondary" onClick={handleNext}>
          {currentIdx + 1 < questions.length ? "Siguiente Desafío" : "Ver Resultados"}
        </Button>
      )}
    </div>
  );
};
