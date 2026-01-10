
import { GoogleGenAI } from "@google/genai";

export const callGemini = async (prompt: string, systemInstruction: string, schema?: any) => {
  let source = "ninguna";
  let rawKey: string | undefined = "";

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "undefined") {
    rawKey = process.env.GEMINI_API_KEY;
    source = "GEMINI_API_KEY";
  } else if (process.env.API_KEY && process.env.API_KEY !== "undefined") {
    rawKey = process.env.API_KEY;
    source = "API_KEY";
  }

  const apiKey = rawKey?.trim() || "";
  
  if (!apiKey) {
    throw new Error("Configuración insuficiente: No se encontró GEMINI_API_KEY ni API_KEY en el entorno.");
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
    const masked = apiKey.length > 6 ? `${apiKey.substring(0, 4)}...` : "???";
    throw new Error(`Error en Gemini (Fuente: ${source}, Clave: ${masked}): ${error.message}`);
  }
};
