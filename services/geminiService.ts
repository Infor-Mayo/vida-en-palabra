
import { GoogleGenAI, Type } from "@google/genai";
import { DevotionalData, ReadingPlan, PlanDuration, AIProvider } from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Usamos la clave de entorno si está disponible, de lo contrario la proporcionada.
const FALLBACK_OR_KEY = "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";

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
    throw new Error("No se pudo encontrar un formato JSON válido en la respuesta.");
  }
  
  const jsonStr = rawText.substring(startIdx, endIdx + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Si falla el parseo, intentamos limpiar caracteres de control comunes en LLMs
    const sanitized = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    try {
      return JSON.parse(sanitized);
    } catch (innerError) {
      console.error("Error final de parseo:", sanitized);
      throw new Error("Error de formato en la respuesta de la IA.");
    }
  }
};

const fetchFromOpenRouter = async (messages: any[]): Promise<any> => {
  const apiKey = process.env.OpenRouter_API_KEY || FALLBACK_OR_KEY;
  
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://vidapalabra.app",
        "X-Title": "Vida en la Palabra",
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free", // Actualizado a Gemma 3
        messages: messages,
        temperature: 0.4,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || `Error ${response.status}`;
      
      // Manejo específico para errores de proveedor saturado
      if (msg.toLowerCase().includes("provider returned error")) {
        throw new Error("El proveedor de Gemma está saturado en este momento. Por favor, selecciona 'Gemini' en el menú superior para continuar.");
      }
      throw new Error(msg);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error("La IA no devolvió ninguna respuesta.");
    return cleanJsonResponse(content);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const generateDevotional = async (passage: string, provider: AIProvider, numQuestions: number = 10): Promise<DevotionalData> => {
  if (provider === 'gemini') {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Usamos el modelo más reciente y estable disponible gratis
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Realiza un estudio devocional completo de: "${passage}"` }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION(numQuestions),
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA(numQuestions)
        }
      });
      
      if (!response.text) throw new Error("Gemini no pudo generar el contenido.");
      return cleanJsonResponse(response.text);
    } catch (error: any) {
      throw new Error(`Error en Gemini: ${error.message}`);
    }
  } else {
    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION(numQuestions) },
      { role: "user", content: `Analiza este pasaje bíblico y genera un JSON completo: "${passage}"` }
    ];
    return await fetchFromOpenRouter(messages);
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration, provider: AIProvider): Promise<ReadingPlan> => {
  const prompt = `Crea un itinerario de lectura bíblica sobre "${topic}" (${duration}). Responde estrictamente en JSON.`;
  
  if (provider === 'gemini') {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      throw new Error(`Error en Gemini Plan: ${error.message}`);
    }
  } else {
    const messages = [
      { role: "system", content: "Genera itinerarios de lectura bíblica en formato JSON." },
      { role: "user", content: prompt }
    ];
    return await fetchFromOpenRouter(messages);
  }
};
