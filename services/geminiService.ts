
import { DevotionalData, ReadingPlan, PlanDuration } from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const fetchFromOpenRouter = async (messages: any[], responseSchema?: any) => {
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

export const generateDevotional = async (passage: string, numQuestions: number = 10): Promise<DevotionalData> => {
  const systemInstruction = `Eres un asistente de estudios bíblicos académico y pedagógico. 
Tu tarea es convertir una referencia bíblica en un material de estudio interactivo en español.

PAUTAS CRÍTICAS:
1. TRATAMIENTO DE TEMAS DIFÍCILES: Si el pasaje incluye sufrimiento o conflicto, trátalo desde la resiliencia y la sabiduría literaria.
2. TEXTO COMPLETO: La propiedad 'passageText' DEBE tener los versículos completos.
3. CUESTIONARIO: Genera exactamente ${numQuestions} preguntas variadas (múltiple, completar, ordenar).
4. El resultado DEBE ser un JSON válido con la siguiente estructura:
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

  const messages = [
    { role: "system", content: systemInstruction },
    { role: "user", content: `Analiza profundamente el pasaje: "${passage}"` }
  ];

  try {
    return await fetchFromOpenRouter(messages) as DevotionalData;
  } catch (error: any) {
    console.error("Error en generateDevotional:", error);
    throw new Error(error.message || "No se pudo generar el estudio.");
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration): Promise<ReadingPlan> => {
  const systemInstruction = `Crea un itinerario de lectura bíblica en JSON.
Estructura:
{
  "title": "string",
  "description": "string",
  "duration": "string",
  "items": [{"id": "Día 1", "passage": "string", "theme": "string", "reason": "string"}]
}`;

  const messages = [
    { role: "system", content: systemInstruction },
    { role: "user", content: `Crea un plan sobre "${topic}" con duración "${duration}"` }
  ];

  try {
    return await fetchFromOpenRouter(messages) as ReadingPlan;
  } catch (error: any) {
    console.error("Error en generateReadingPlan:", error);
    throw new Error("Error al diseñar el plan de lectura.");
  }
};
