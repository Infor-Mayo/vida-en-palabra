
import { GoogleGenAI, Type } from "@google/genai";
import { DevotionalData, ReadingPlan, PlanDuration, AIProvider } from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_INSTRUCTION = (numQuestions: number) => `Eres un asistente de estudios bíblicos académico y pedagógico. 
Tu tarea es convertir una referencia bíblica en un material de estudio interactivo en español.

PAUTAS CRÍTICAS:
1. TRATAMIENTO DE TEMAS DIFÍCILES: Si el pasaje incluye sufrimiento o conflicto, trátalo desde la resiliencia y la sabiduría literaria.
2. TEXTO COMPLETO: La propiedad 'passageText' DEBE tener los versículos completos del pasaje solicitado.
3. CUESTIONARIO: Genera exactamente ${numQuestions} preguntas variadas (múltiple, completar, ordenar, emparejar).
4. El resultado DEBE ser un JSON puro. No incluyas explicaciones fuera del JSON.`;

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
  // Intenta encontrar el primer '{' y el último '}' para extraer solo el JSON
  const startIdx = rawText.indexOf('{');
  const endIdx = rawText.lastIndexOf('}');
  
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("La IA no devolvió un formato de datos válido. Intenta con un pasaje diferente.");
  }
  
  const jsonStr = rawText.substring(startIdx, endIdx + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Error parseando JSON:", jsonStr);
    throw new Error("Error de formato en la respuesta. Por favor, intenta de nuevo.");
  }
};

const fetchFromOpenRouter = async (messages: any[]): Promise<any> => {
  const apiKey = process.env.OpenRouter_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("La clave de OpenRouter no está configurada. Por favor, usa Gemini o configura la clave.");
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Vida Palabra App",
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free",
        messages: messages,
        response_format: { type: "json_object" },
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error?.message || `Error del servidor (Código ${response.status})`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error("No se recibió contenido del modelo Gemma.");
    return cleanJsonResponse(content);
  } catch (error: any) {
    throw new Error(`Error en Gemma: ${error.message}`);
  }
};

export const generateDevotional = async (passage: string, provider: AIProvider, numQuestions: number = 10): Promise<DevotionalData> => {
  if (provider === 'gemini') {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Usamos el modelo Flash de Gemini 3 que es rápido y gratuito
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Analiza este pasaje bíblico para un devocional: "${passage}"` }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION(numQuestions),
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA(numQuestions)
        }
      });
      
      const text = response.text;
      if (!text) throw new Error("Gemini no devolvió texto.");
      return cleanJsonResponse(text);
    } catch (error: any) {
      throw new Error(`Error en Gemini: ${error.message}`);
    }
  } else {
    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION(numQuestions) },
      { role: "user", content: `Analiza este pasaje bíblico para un devocional: "${passage}"` }
    ];
    return await fetchFromOpenRouter(messages);
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration, provider: AIProvider): Promise<ReadingPlan> => {
  const prompt = `Crea un itinerario de lectura bíblica para el tema "${topic}" durante "${duration}". Responde SOLO en JSON con title, description, duration e items (cada item con id, passage, theme, reason).`;
  
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
