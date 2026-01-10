
import { GoogleGenAI, Type } from "@google/genai";
import { DevotionalData, ReadingPlan, PlanDuration, AIProvider } from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_INSTRUCTION = (numQuestions: number) => `Eres un asistente de estudios bíblicos académico y pedagógico. 
Tu tarea es convertir una referencia bíblica en un material de estudio interactivo en español.

PAUTAS CRÍTICAS:
1. TRATAMIENTO DE TEMAS DIFÍCILES: Si el pasaje incluye sufrimiento o conflicto, trátalo desde la resiliencia y la sabiduría literaria.
2. TEXTO COMPLETO: La propiedad 'passageText' DEBE tener los versículos completos del pasaje solicitado.
3. CUESTIONARIO: Genera exactamente ${numQuestions} preguntas variadas (múltiple, completar, ordenar, emparejar).
4. El resultado DEBE ser un JSON puro. No incluyas explicaciones fuera del JSON. 
ESTRUCTURA OBLIGATORIA:
{
  "title": "string",
  "passageText": "string",
  "summary": "string",
  "historicalContext": "string",
  "keyVerses": ["string"],
  "quiz": [{"type": "string", "question": "string", "explanation": "string", "options": ["string"], "correctIndex": 0}],
  "reflectionPrompts": ["string"],
  "practicalApplication": "string",
  "dailyPlan": [{"day": 1, "focus": "string", "verse": "string", "action": "string"}]
}`;

const RESPONSE_SCHEMA = (numQuestions: number) => ({
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
          correctIndices: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          pairs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { left: { type: Type.STRING }, right: { type: Type.STRING } } } },
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
        }
      }
    }
  },
  required: ["title", "passageText", "summary", "historicalContext", "keyVerses", "quiz", "reflectionPrompts", "practicalApplication", "dailyPlan"]
});

const cleanJsonResponse = (rawText: string): any => {
  const startIdx = rawText.indexOf('{');
  const endIdx = rawText.lastIndexOf('}');
  
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("No se pudo encontrar un formato JSON válido en la respuesta de la IA.");
  }
  
  const jsonStr = rawText.substring(startIdx, endIdx + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    const sanitized = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    try {
      return JSON.parse(sanitized);
    } catch (innerError) {
      throw new Error("Error crítico: La IA generó un JSON mal formado.");
    }
  }
};

const fetchFromOpenRouter = async (messages: any[]): Promise<any> => {
  const apiKey = (process.env.OpenRouter_API_KEY || "").trim();
  
  if (!apiKey) {
    throw new Error("La variable 'OpenRouter_API_KEY' no está configurada en el archivo .env.");
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Vida Palabra Devocional",
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free",
        messages: messages,
        temperature: 0.4,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || `Error ${response.status}`;
      if (response.status === 401 || msg.toLowerCase().includes("key")) {
        throw new Error("Error de autenticación: Tu clave de OpenRouter es inválida. Revisa el archivo .env.");
      }
      throw new Error(msg);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No se recibió respuesta de OpenRouter.");
    
    return cleanJsonResponse(content);
  } catch (error: any) {
    throw new Error(error.message || "Error de red con OpenRouter.");
  }
};

export const generateDevotional = async (passage: string, provider: AIProvider, numQuestions: number = 10): Promise<DevotionalData> => {
  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Estudio profundo de: "${passage}"` }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION(numQuestions),
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA(numQuestions)
        }
      });
      
      if (!response.text) throw new Error("Gemini no devolvió contenido.");
      return cleanJsonResponse(response.text);
    } catch (error: any) {
      throw new Error(`Error Gemini: ${error.message}`);
    }
  } else {
    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION(numQuestions) },
      { role: "user", content: `Analiza el pasaje: "${passage}"` }
    ];
    return await fetchFromOpenRouter(messages);
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration, provider: AIProvider): Promise<ReadingPlan> => {
  const prompt = `Crea un plan de lectura para: "${topic}" (${duration}). Responde estrictamente en JSON.`;
  
  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              duration: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    passage: { type: Type.STRING },
                    theme: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["title", "description", "duration", "items"]
          }
        }
      });
      return cleanJsonResponse(response.text || "{}");
    } catch (error: any) {
      throw new Error(`Error Gemini Plan: ${error.message}`);
    }
  } else {
    const messages = [
      { role: "system", content: "Experto en teología. Responde solo en JSON." },
      { role: "user", content: prompt }
    ];
    return await fetchFromOpenRouter(messages);
  }
};
