
import { GoogleGenAI } from "@google/genai";

export const callGemini = async (prompt: string, systemInstruction: string, schema?: any) => {
  const getGeminiKey = () => {
    const env = process.env as any;
    // Preferencia a GEMINI_API_KEY si existe, si no, API_KEY
    const key = env.GEMINI_API_KEY || env.API_KEY;
    
    if (key && key !== "undefined" && key.trim().length > 0) {
      return key.trim();
    }
    return null;
  };

  const apiKey = getGeminiKey();

  if (!apiKey) {
    throw new Error("No se detectó ninguna clave en [API_KEY]. Revisa la configuración de tu servidor.");
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
    if (error.message.includes("API key not valid")) {
       throw new Error("La clave en [API_KEY] no es válida para Gemini. Asegúrate de que empiece con AIza...");
    }
    throw new Error(`Error en Gemini: ${error.message}`);
  }
};
