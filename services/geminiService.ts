
import { GoogleGenAI, Type } from "@google/genai";
import { DevotionalData, ReadingPlan, PlanDuration, AIProvider } from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_INSTRUCTION = (numQuestions: number) => `Eres un asistente de estudios bíblicos académico y pedagógico. 
Tu tarea es convertir una referencia bíblica en un material de estudio interactivo en español.

PAUTAS CRÍTICAS:
1. TRATAMIENTO DE TEMAS DIFÍCILES: Si el pasaje incluye sufrimiento o conflicto, trátalo desde la resiliencia y la sabiduría literaria.
2. TEXTO COMPLETO: La propiedad 'passageText' DEBE tener los versículos completos del pasaje solicitado.
3. CUESTIONARIO: Genera exactamente ${numQuestions} preguntas variadas (múltiple-choice, matching, ordering, fill-in-the-blanks).
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
  try {
    const startIdx = rawText.indexOf('{');
    const endIdx = rawText.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) throw new Error("Formato JSON no encontrado");
    const jsonStr = rawText.substring(startIdx, endIdx + 1);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Error parseando JSON:", rawText);
    throw new Error("La respuesta de la IA no pudo ser procesada como datos válidos.");
  }
};

const fetchFromOpenRouter = async (messages: any[]): Promise<any> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Clave de OpenRouter (OPENROUTER_API_KEY) no configurada.");

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
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.error?.message || `Error ${response.status}`;
    throw new Error(`OpenRouter Error: ${errorMsg}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No se recibió contenido de Gemma.");
  return cleanJsonResponse(content);
};

export const generateDevotional = async (passage: string, provider: AIProvider, numQuestions: number = 10): Promise<DevotionalData> => {
  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `Realiza un estudio devocional profundo y académico del pasaje: "${passage}"` }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION(numQuestions),
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA(numQuestions)
      }
    });
    
    if (!response.text) throw new Error("Gemini no devolvió texto.");
    return JSON.parse(response.text);
  } else {
    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION(numQuestions) },
      { role: "user", content: `Estudio bíblico interactivo para: "${passage}"` }
    ];
    return await fetchFromOpenRouter(messages);
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration, provider: AIProvider): Promise<ReadingPlan> => {
  const prompt = `Crea un plan de lectura bíblica temático sobre "${topic}" para una duración de "${duration}". Responde SOLO en JSON.`;
  
  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
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
    return JSON.parse(response.text || "{}");
  } else {
    const messages = [
      { role: "system", content: "Eres un experto teólogo que genera planes de lectura en JSON." },
      { role: "user", content: prompt }
    ];
    return await fetchFromOpenRouter(messages);
  }
};
