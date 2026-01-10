
import { GoogleGenAI } from "@google/genai";

export const callGemini = async (prompt: string, systemInstruction: string, schema?: any) => {
  // Buscamos prioritariamente la clave específica de Gemini
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error("No se encontró la configuración para Gemini (Falta GEMINI_API_KEY o API_KEY).");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  
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
};
