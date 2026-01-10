
import { GoogleGenAI } from "@google/genai";
import { getSecretKey } from "./keyParser";

export const callGemini = async (prompt: string, systemInstruction: string, model: 'gemini-3-flash-preview' | 'gemini-3-pro-preview', schema?: any) => {
  const apiKey = getSecretKey('goo');

  if (!apiKey) {
    throw new Error("No se pudo extraer la llave de Google (goo[...]) de la variable maestra.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { 
        systemInstruction: systemInstruction, 
        responseMimeType: schema ? "application/json" : "text/plain",
        responseSchema: schema
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Error en Gemini Provider:", error);
    throw new Error(`Error de conexión con Gemini: ${error.message}`);
  }
};
