
import { GoogleGenAI, Type } from "@google/genai";
import { DevotionalData, ReadingPlan, PlanDuration, AIProvider } from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_INSTRUCTION = (numQuestions: number) => `Eres un asistente de estudios bíblicos académico y pedagógico. 
Tu tarea es convertir una referencia bíblica en un material de estudio interactivo en español.

PAUTAS CRÍTICAS:
1. TRATAMIENTO DE TEMAS DIFÍCILES: Si el pasaje incluye sufrimiento o conflicto, trátalo desde la resiliencia y la sabiduría literaria.
2. TEXTO COMPLETO: La propiedad 'passageText' DEBE tener los versículos completos del pasaje solicitado.
3. CUESTIONARIO: Genera exactamente ${numQuestions} preguntas variadas (múltiple, completar, ordenar, emparejar).
4. El resultado DEBE ser un JSON válido.`;

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

const fetchFromOpenRouter = async (messages: any[]): Promise<any> => {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "Vida en la Palabra",
    },
    body: JSON.stringify({
      model: "google/gemma-3-27b-it:free",
      messages: messages,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Error al conectar con OpenRouter");
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};

const fetchFromGeminiDirect = async (prompt: string, numQuestions: number): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION(numQuestions),
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA(numQuestions),
      thinkingConfig: { thinkingBudget: 15000 }
    }
  });
  
  return JSON.parse(response.text || "{}");
};

export const generateDevotional = async (passage: string, provider: AIProvider, numQuestions: number = 10): Promise<DevotionalData> => {
  try {
    if (provider === 'gemini') {
      return await fetchFromGeminiDirect(`Analiza profundamente el pasaje: "${passage}"`, numQuestions) as DevotionalData;
    } else {
      const messages = [
        { role: "system", content: SYSTEM_INSTRUCTION(numQuestions) },
        { role: "user", content: `Analiza profundamente el pasaje: "${passage}"` }
      ];
      return await fetchFromOpenRouter(messages) as DevotionalData;
    }
  } catch (error: any) {
    console.error("Error en generateDevotional:", error);
    throw new Error(error.message || "No se pudo generar el estudio.");
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration, provider: AIProvider): Promise<ReadingPlan> => {
  const prompt = `Crea un itinerario de lectura bíblica para el tema "${topic}" con duración "${duration}" en formato JSON.`;
  const schema = {
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
    }
  };

  try {
    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
      return JSON.parse(response.text || "{}") as ReadingPlan;
    } else {
      const messages = [
        { role: "system", content: "Crea un itinerario de lectura bíblica en JSON." },
        { role: "user", content: prompt }
      ];
      return await fetchFromOpenRouter(messages) as ReadingPlan;
    }
  } catch (error: any) {
    console.error("Error en generateReadingPlan:", error);
    throw new Error("Error al diseñar el plan de lectura.");
  }
};
