
import { Type } from "@google/genai";
import { DevotionalData, ReadingPlan, PlanDuration, ModelType, QuizDifficulty } from "../types";
import { callGemini } from "./geminiProvider";
import { callGemma } from "./gemmaProvider";
import { cleanJsonResponse, handleServiceError } from "./errorHandler";

const FULL_DEVOTIONAL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    passageText: { type: Type.STRING },
    summary: { type: Type.STRING },
    historicalContext: { type: Type.STRING },
    keyVerses: { type: Type.ARRAY, items: { type: Type.STRING } },
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          question: { type: Type.STRING },
          explanation: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctIndex: { type: Type.NUMBER },
          pairs: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                left: { type: Type.STRING }, 
                right: { type: Type.STRING } 
              } 
            } 
          },
          orderedItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          textWithBlanks: { type: Type.STRING },
          blankAnswers: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["type", "question", "explanation"]
      }
    },
    reflectionPrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
    practicalApplication: { type: Type.STRING },
    dailyPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.NUMBER },
          focus: { type: Type.STRING },
          verse: { type: Type.STRING },
          action: { type: Type.STRING }
        },
        required: ["day", "focus", "verse", "action"]
      }
    }
  },
  required: [
    "title", "passageText", "summary", "historicalContext", "keyVerses", 
    "quiz", "reflectionPrompts", "practicalApplication", "dailyPlan"
  ]
};

const getSystemPrompt = (num: number, diff: QuizDifficulty, isGemma: boolean = false) => {
  const base = `Eres un erudito bíblico de alto nivel. Genera un devocional interactivo completo en JSON.
INSTRUCCIONES:
1. NARRATIVA: Título creativo, texto del pasaje, resumen teológico profundo y contexto histórico.
2. RETOS: Genera exactamente ${num} retos variados de dificultad ${diff.toUpperCase()}.
3. APLICACIÓN: Reflexión práctica transformadora, 3 preguntas de diario y plan de 5 días.
RESPONDE EXCLUSIVAMENTE CON JSON PURO.`;

  if (isGemma) {
    return `${base}
ESTRUCTURA DE RETOS (EJEMPLOS):
- Si type="multiple-choice": usar "options": ["A", "B"] y "correctIndex": 0.
- Si type="matching": usar "pairs": [{"left": "Termino", "right": "Definicion"}].
- Si type="fill-in-the-blanks": usar "textWithBlanks": "El [blank] es amor" y "blankAnswers": ["Dios"].

JSON COMPLETO DEBE SEGUIR ESTA LLAVE:
{
  "title": "...",
  "passageText": "...",
  "summary": "...",
  "historicalContext": "...",
  "keyVerses": ["..."],
  "quiz": [
    {"type": "multiple-choice", "question": "...", "options": ["..."], "correctIndex": 0, "explanation": "..."},
    {"type": "matching", "question": "...", "pairs": [{"left": "...", "right": "..."}], "explanation": "..."}
  ],
  "reflectionPrompts": ["..."],
  "practicalApplication": "...",
  "dailyPlan": [{"day": 1, "focus": "...", "verse": "...", "action": "..."}]
}`;
  }
  return base;
};

export const generateDevotional = async (
  passage: string, 
  modelType: ModelType, 
  numQuestions: number = 5, 
  difficulty: QuizDifficulty = 'medium'
): Promise<DevotionalData> => {
  const isGemma = modelType === 'gemma';
  const systemPrompt = getSystemPrompt(numQuestions, difficulty, isGemma);
  const userPrompt = `Genera un devocional para: "${passage}"`;

  try {
    let responseText: string;
    
    if (modelType === 'gemma') {
      responseText = await callGemma(userPrompt, systemPrompt);
    } else {
      const selectedModel = modelType === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
      responseText = await callGemini(userPrompt, systemPrompt, selectedModel, FULL_DEVOTIONAL_SCHEMA);
    }
    
    return cleanJsonResponse(responseText);
  } catch (error: any) {
    handleServiceError(error, "generación del devocional");
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration, modelType: ModelType): Promise<ReadingPlan> => {
  const isGemma = modelType === 'gemma';
  const systemMsg = isGemma 
    ? "Eres un planificador bíblico experto. Responde solo con JSON puro siguiendo esta estructura: { \"title\": \"\", \"description\": \"\", \"duration\": \"\", \"items\": [ { \"id\": \"Etapa 1\", \"passage\": \"\", \"theme\": \"\", \"reason\": \"\" } ] }"
    : "Eres un planificador bíblico experto. Responde solo con JSON puro.";
    
  const prompt = `Crea un plan de lectura bíblica sobre "${topic}" para una duración "${duration}". Estructura JSON: title, description, duration, items (array con objetos {id, passage, theme, reason}).`;
  
  try {
    let responseText: string;
    
    if (modelType === 'gemma') {
      responseText = await callGemma(prompt, systemMsg);
    } else {
      const selectedModel = modelType === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
      responseText = await callGemini(prompt, systemMsg, selectedModel);
    }
    
    return cleanJsonResponse(responseText);
  } catch (error: any) {
    handleServiceError(error, "creación del plan de lectura");
  }
};
