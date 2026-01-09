
import { GoogleGenAI, Type } from "@google/genai";
import { DevotionalData, ReadingPlan, PlanDuration } from "../types";

export const generateDevotional = async (passage: string, numQuestions: number = 10): Promise<DevotionalData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Realiza un estudio exegético y pedagógico exhaustivo sobre el pasaje: "${passage}".`,
      config: {
        thinkingConfig: { thinkingBudget: 15000 },
        systemInstruction: `Eres un experto en Estudios Bíblicos, Hermenéutica y Pedagogía. Tu objetivo es transformar una referencia bíblica en un estudio interactivo de alto nivel en español.

PAUTAS DE COMPORTAMIENTO:
1. Adopta un tono puramente académico, histórico y de reflexión espiritual constructiva. 
2. Si el pasaje trata sobre temas difíciles (como Job 1, sufrimientos o conflictos), analízalos desde una perspectiva literaria y de contexto histórico, enfocándote en las lecciones de resiliencia, sabiduría y estructura del texto.
3. NO generes contenido que incite al odio o a la desesperanza. Enfócate en la enseñanza y el aprendizaje.
4. OBLIGATORIO: Recupera el texto completo de los versículos en la propiedad 'passageText'. No resumas el texto sagrado ahí, escríbelo íntegramente.
5. Genera exactamente ${numQuestions} preguntas variadas para el cuestionario (quiz) que incluyan los tipos: multiple-choice, matching, ordering, fill-in-the-blanks y open-ended.

FORMATO DE SALIDA:
Entrega exclusivamente un objeto JSON válido. No incluyas advertencias, notas al pie ni introducciones fuera del JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
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
                }
              }
            }
          },
          required: ["title", "passageText", "summary", "historicalContext", "keyVerses", "quiz", "reflectionPrompts", "practicalApplication", "dailyPlan"]
        }
      }
    });

    const candidate = response.candidates?.[0];
    const text = response.text;

    if (!text || text.trim().length === 0) {
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error("El sistema de seguridad ha declinado la respuesta por la naturaleza sensible del pasaje. Prueba solicitando un análisis puramente histórico.");
      }
      throw new Error("La IA no pudo procesar este pasaje en este momento. Intenta con una referencia más corta o específica.");
    }

    try {
      return JSON.parse(text) as DevotionalData;
    } catch (parseError) {
      console.error("Error al parsear el JSON de la IA:", text);
      throw new Error("El estudio se generó con errores de formato. Por favor, reintenta.");
    }
  } catch (error: any) {
    console.error("Error en generateDevotional:", error);
    if (error.message?.includes("Rpc failed") || error.message?.includes("xhr")) {
      throw new Error("Error de conexión. Por favor, comprueba tu internet e intenta de nuevo.");
    }
    throw error;
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration): Promise<ReadingPlan> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Crea un itinerario de lectura bíblica profundo sobre: "${topic}" con una duración: ${duration}.`,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        systemInstruction: "Eres un mentor espiritual. Diseña planes de lectura que conecten pasajes del Antiguo y Nuevo Testamento para un crecimiento integral.",
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
                },
                required: ["id", "passage", "theme", "reason"]
              }
            }
          },
          required: ["title", "description", "duration", "items"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No se pudo obtener el plan de lectura.");
    return JSON.parse(text) as ReadingPlan;
  } catch (error: any) {
    console.error("Error en generateReadingPlan:", error);
    throw new Error("Error al generar el plan. Intenta con otro tema.");
  }
};
