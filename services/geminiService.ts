
import { Type } from "@google/genai";
import { DevotionalData, ReadingPlan, PlanDuration, AIProvider, QuizDifficulty } from "../types";
import { callGemini } from "./geminiProvider";
import { callGemma } from "./gemmaProvider";
import { cleanJsonResponse, handleServiceError } from "./errorHandler";

// --- ESQUEMA DE RESPUESTA INTEGRADO ---
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

const getSystemPrompt = (num: number, diff: QuizDifficulty) => `Eres un erudito bíblico. Genera un devocional interactivo completo en JSON.
INSTRUCCIONES:
1. NARRATIVA: Título, texto del pasaje, resumen teológico y contexto.
2. RETOS: Genera exactamente ${num} retos variados de nivel ${diff.toUpperCase()}.
3. APLICACIÓN: Reflexión práctica, 3 preguntas de diario y plan de 5 días.
RESPONDE EXCLUSIVAMENTE CON JSON PURO. NO añadas introducciones ni explicaciones fuera del JSON.`;

export const generateDevotional = async (
  passage: string, 
  provider: AIProvider, 
  numQuestions: number = 6, 
  difficulty: QuizDifficulty = 'medium'
): Promise<DevotionalData> => {
  const systemPrompt = getSystemPrompt(numQuestions, difficulty);
  const userPrompt = `Genera un devocional para: "${passage}"`;

  try {
    let responseText: string;
    if (provider === 'gemini') {
      responseText = await callGemini(userPrompt, systemPrompt, FULL_DEVOTIONAL_SCHEMA);
    } else {
      responseText = await callGemma(userPrompt, systemPrompt);
    }
    return cleanJsonResponse(responseText);
  } catch (error: any) {
    handleServiceError(error, "generación del devocional");
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration, provider: AIProvider): Promise<ReadingPlan> => {
  const systemMsg = "Eres un planificador bíblico. Responde solo con JSON puro.";
  const prompt = `Plan de lectura sobre "${topic}" para "${duration}". JSON: title, description, duration, items (array {id, passage, theme, reason}).`;
  
  try {
    let responseText: string;
    if (provider === 'gemini') {
      responseText = await callGemini(prompt, systemMsg);
    } else {
      responseText = await callGemma(prompt, systemMsg);
    }
    return cleanJsonResponse(responseText);
  } catch (error: any) {
    handleServiceError(error, "creación del plan de lectura");
  }
};
