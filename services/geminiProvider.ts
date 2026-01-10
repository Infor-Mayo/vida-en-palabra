
import { GoogleGenAI } from "@google/genai";

export const callGemini = async (prompt: string, systemInstruction: string, schema?: any) => {
  let source = "ninguna";
  let apiKey = "";

  // Prioridad: 1. GEMINI_API_KEY, 2. API_KEY (si empieza por AIza)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "undefined") {
    apiKey = process.env.GEMINI_API_KEY.trim();
    source = "GEMINI_API_KEY";
  } else if (process.env.API_KEY && process.env.API_KEY !== "undefined") {
    const val = process.env.API_KEY.trim();
    if (val.startsWith("AIza")) {
      apiKey = val;
      source = "API_KEY (Detectada como Gemini)";
    }
  }

  if (!apiKey) {
    throw new Error("No se encontró una clave válida de Gemini (AIza...). Revisa tu configuración.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        systemInstruction: systemInstruction, 
        responseMimeType: schema ? "application/json" : "text/plain",
        responseSchema: schema
      }
    });

    return response.text || "";
  } catch (error: any) {
    throw new Error(`Error en Gemini (${source}): ${error.message}`);
  }
};
