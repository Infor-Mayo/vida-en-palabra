
import { GoogleGenAI, Type } from "@google/genai";
import { DevotionalData, ReadingPlan, PlanDuration } from "../types";

export const generateDevotional = async (passage: string, numQuestions: number = 10): Promise<DevotionalData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Proporciona un análisis literario, histórico y espiritual profundo de: "${passage}".`,
      config: {
        thinkingConfig: { thinkingBudget: 15000 },
        systemInstruction: `Eres un asistente de estudios bíblicos académico y pedagógico. 
Tu tarea es convertir una referencia bíblica en un material de estudio interactivo en español.

PAUTAS CRÍTICAS:
1. TRATAMIENTO DE TEMAS DIFÍCILES: Si el pasaje incluye sufrimiento, pérdida o conflicto (como Job 1), trátalo desde una perspectiva de "Resiliencia Humana", "Análisis Literario de la Sabiduría" y "Lecciones Teológicas de Integridad". Evita el lenguaje truculento y enfócate en la enseñanza pedagógica.
2. TEXTO COMPLETO: Es obligatorio que la propiedad 'passageText' contenga el texto completo de los versículos solicitados.
3. CUESTIONARIO: Genera exactamente ${numQuestions} preguntas variadas (opción múltiple, completar, ordenar).
4. El resultado DEBE ser un JSON válido. No incluyas texto fuera del objeto JSON.`,
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

    const text = response.text;
    if (!text) throw new Error("La IA no devolvió contenido.");
    
    return JSON.parse(text) as DevotionalData;
  } catch (error: any) {
    console.error("Error en generateDevotional:", error);
    if (error.message?.includes("SAFETY")) {
      throw new Error("El sistema de seguridad ha declinado la respuesta por la naturaleza del pasaje. Prueba con una referencia más específica.");
    }
    throw new Error("No se pudo generar el estudio. Intenta de nuevo en unos momentos.");
  }
};

export const generateReadingPlan = async (topic: string, duration: PlanDuration): Promise<ReadingPlan> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Crea un itinerario de lectura para el tema: "${topic}" con duración: ${duration}.`,
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
    return JSON.parse(text) as ReadingPlan;
  } catch (error) {
    console.error("Error en generateReadingPlan:", error);
    throw new Error("Error al diseñar el plan de lectura.");
  }
};
