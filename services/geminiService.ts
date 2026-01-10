
import { GoogleGenAI, Type } from "@google/genai";
import { DevotionalData, ReadingPlan, PlanDuration, AIProvider } from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_INSTRUCTION = (numQuestions: number) => `Eres un asistente de estudios bíblicos académico. 
Tarea: Generar un estudio interactivo en español para una referencia bíblica.

REGLAS DE CONCISIÓN (CRÍTICO):
1. 'passageText': Incluye solo los versículos del pasaje (máximo 1500 palabras). No incluyas toda la Biblia.
2. 'summary' y 'historicalContext': Sé profundo pero directo (máximo 3 párrafos cada uno).
3. 'quiz': Genera exactamente ${numQuestions} preguntas. Las explicaciones deben ser breves (máximo 2 frases).
4. El resultado DEBE ser un JSON puro. No incluyas texto adicional antes o después.

ESTRUCTURA:
{
  "title": "string",
  "passageText": "string",
  "summary": "string",
  "historicalContext": "string",
  "keyVerses": ["string"],
  "quiz": [{"type": "multiple-choice|matching|ordering|fill-in-the-blanks", "question": "string", "explanation": "string", "options": ["string"], "correctIndex": 0}],
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
    let cleaned = rawText.trim();
    // Limpiar posibles envoltorios de Markdown
    if (cleaned.includes('```')) {
      const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) cleaned = match[1];
    }
    
    // Buscar el primer '{' y el último '}' para ignorar cualquier texto basura del modelo
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
        throw new Error("No se encontró un objeto JSON válido en la respuesta.");
    }
    
    const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
    return JSON.parse(jsonCandidate);
  } catch (e: any) {
    console.error("Error al parsear JSON:", rawText);
    if (rawText.length > 50000) {
        throw new Error("La respuesta de la IA fue demasiado larga y se cortó. Por favor, intenta con un pasaje más corto.");
    }
    throw new Error(`Error de formato en la respuesta: ${e.message}`);
  }
};

export const generateDevotional = async (passage: string, provider: AIProvider, numQuestions: number = 10): Promise<DevotionalData> => {
  if (provider === 'gemini') {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY no encontrada. Configúrala en Railway o en tu archivo .env.");
    
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `Genera un estudio bíblico para: "${passage}". Sé conciso.` }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION(numQuestions),
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA(numQuestions)
      }
    });
    
    if (!response.text) throw new Error("Gemini no devolvió texto.");
    return cleanJsonResponse(response.text);
  } else {
    const orKey = process.env.OPENROUTER_API_KEY;
    if (!orKey) throw new Error("OPENROUTER_API_KEY no encontrada.");

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${orKey}`,
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free",
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION(numQuestions) },
          { role: "user", content: `Analiza: "${passage}"` }
        ],
        temperature: 0.1, // Temperatura baja para más estabilidad en JSON
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Error con Gemma");
    return cleanJsonResponse(data.choices[0].message.content);
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration, provider: AIProvider): Promise<ReadingPlan> => {
  const prompt = `Crea un plan de lectura bíblica sobre "${topic}" para "${duration}". Devuelve SOLO JSON.`;
  
  if (provider === 'gemini') {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY no configurada.");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: { 
        responseMimeType: "application/json",
      }
    });
    return cleanJsonResponse(response.text || "{}");
  } else {
    const orKey = process.env.OPENROUTER_API_KEY;
    if (!orKey) throw new Error("OPENROUTER_API_KEY no configurada.");
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${orKey}`,
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    return cleanJsonResponse(data.choices[0].message.content);
  }
};
