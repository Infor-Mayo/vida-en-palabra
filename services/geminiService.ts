
import { GoogleGenAI, Type } from "@google/genai";
import { DevotionalData, ReadingPlan, PlanDuration, AIProvider, QuizDifficulty } from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// --- ESQUEMAS DE RESPUESTA ---

const NARRATIVE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    passageText: { type: Type.STRING },
    summary: { type: Type.STRING },
    historicalContext: { type: Type.STRING },
    keyVerses: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["title", "passageText", "summary", "historicalContext", "keyVerses"]
};

const QUIZ_SCHEMA = {
  type: Type.OBJECT,
  properties: {
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
    }
  },
  required: ["quiz"]
};

const APPLICATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
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
  required: ["reflectionPrompts", "practicalApplication", "dailyPlan"]
};

// --- INSTRUCCIONES MODULARES REFORZADAS ---

const SYSTEM_NARRATIVE = `Eres un erudito bíblico. Genera la parte EXPLICATIVA. 
Asegúrate de incluir el 'passageText' completo del pasaje solicitado.`;

const SYSTEM_QUIZ = (num: number, diff: QuizDifficulty) => `Eres un educador bíblico experto en pedagogía. 
Genera un cuestionario interactivo de nivel ${diff.toUpperCase()}. 
REGLAS CRÍTICAS DE FORMATO:
1. 'multiple-choice': DEBES incluir 'options' (4 opciones) y 'correctIndex' (0-3).
2. 'fill-in-the-blanks': El campo 'textWithBlanks' DEBE contener el texto con marcadores '[blank]' donde falten palabras. El campo 'blankAnswers' DEBE contener las palabras correctas en orden.
3. Genera exactamente ${num} preguntas variadas (matching, ordering, multiple-choice, fill-in-the-blanks). 
Responde con JSON puro.`;

const SYSTEM_APPLICATION = `Eres un mentor espiritual. Genera la aplicación práctica (máx 150 palabras), 3 preguntas de reflexión y un plan de 5 días para profundizar.`;

const cleanJsonResponse = (rawText: string): any => {
  try {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
    const parsed = JSON.parse(cleaned);
    
    // Validación extra para evitar retos vacíos
    if (parsed.quiz) {
      parsed.quiz = parsed.quiz.filter((q: any) => q.question && (q.type !== 'multiple-choice' || (q.options && q.options.length > 0)));
    }
    
    return parsed;
  } catch (e: any) {
    console.error("Error al parsear JSON:", rawText);
    throw new Error(`Error en la respuesta de la IA. Por favor intenta de nuevo con un pasaje más breve.`);
  }
};

const callGemma = async (prompt: string, system: string): Promise<string> => {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${process.env.API_KEY || ''}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "Vida Palabra"
    },
    body: JSON.stringify({
      model: "google/gemma-3-27b-it:free",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};

export const generateDevotional = async (passage: string, provider: AIProvider, numQuestions: number = 6, difficulty: QuizDifficulty = 'medium'): Promise<DevotionalData> => {
  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const p1 = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Genera JSON narrativo para: "${passage}"`,
      config: { 
        systemInstruction: SYSTEM_NARRATIVE, 
        responseMimeType: "application/json",
        responseSchema: NARRATIVE_SCHEMA
      }
    });

    const p2 = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Genera JSON de quiz (${numQuestions} preguntas, nivel ${difficulty}) para: "${passage}"`,
      config: { 
        systemInstruction: SYSTEM_QUIZ(numQuestions, difficulty), 
        responseMimeType: "application/json",
        responseSchema: QUIZ_SCHEMA
      }
    });

    const p3 = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Genera JSON de aplicación para: "${passage}"`,
      config: { 
        systemInstruction: SYSTEM_APPLICATION, 
        responseMimeType: "application/json",
        responseSchema: APPLICATION_SCHEMA
      }
    });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    
    return {
      ...cleanJsonResponse(r1.text || "{}"),
      ...cleanJsonResponse(r2.text || "{}"),
      ...cleanJsonResponse(r3.text || "{}")
    } as DevotionalData;

  } else {
    // Para Gemma a través de OpenRouter
    const p1 = callGemma(`Genera JSON narrativo para: "${passage}"`, SYSTEM_NARRATIVE);
    const p2 = callGemma(`Genera JSON de quiz (${numQuestions} preguntas, nivel ${difficulty}) para: "${passage}"`, SYSTEM_QUIZ(numQuestions, difficulty));
    const p3 = callGemma(`Genera JSON de aplicación para: "${passage}"`, SYSTEM_APPLICATION);
    
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    
    return {
      ...cleanJsonResponse(r1),
      ...cleanJsonResponse(r2),
      ...cleanJsonResponse(r3)
    } as DevotionalData;
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration, provider: AIProvider): Promise<ReadingPlan> => {
  const prompt = `Plan de lectura bíblica sobre "${topic}" para "${duration}". Devuelve JSON: title, description, duration, items (array de {id, passage, theme, reason}).`;
  
  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return cleanJsonResponse(response.text || "{}");
  } else {
    const res = await callGemma(prompt, "Eres un planificador bíblico. Responde solo con JSON puro.");
    return cleanJsonResponse(res);
  }
};
