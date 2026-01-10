
import { GoogleGenAI } from "@google/genai";
import { QuizDifficulty } from "../types";

export const callGemini = async (prompt: string, systemInstruction: string, schema?: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
