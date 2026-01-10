
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callGemma = async (prompt: string, system: string): Promise<string> => {
  let source = "ninguna";
  let rawKey: string | undefined = "";

  // SOLO buscamos en las variables específicas de OpenRouter
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "undefined") {
    rawKey = process.env.OPENROUTER_API_KEY;
    source = "OPENROUTER_API_KEY (Mayúsculas)";
  } else if (process.env.OpenRouter_API_KEY && process.env.OpenRouter_API_KEY !== "undefined") {
    rawKey = process.env.OpenRouter_API_KEY;
    source = "OpenRouter_API_KEY (CamelCase)";
  }

  const apiKey = rawKey?.trim() || "";
  
  // 1. Error si no hay ninguna clave específica de OpenRouter
  if (!apiKey || apiKey === "") {
    throw new Error(
      `Configuración de Gemma Incorrecta:\n` +
      `No se detectó una clave específica para OpenRouter.\n\n` +
      `SISTEMA DETECTÓ:\n` +
      `• OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'Presente' : 'Vacía'}\n` +
      `• OpenRouter_API_KEY: ${process.env.OpenRouter_API_KEY ? 'Presente' : 'Vacía'}\n\n` +
      `Por favor, asegúrate de que una de estas dos variables tenga tu clave que empieza por 'sk-or-...'`
    );
  }

  // 2. Validación de seguridad: ¿Es una clave de Google (Gemini)?
  if (apiKey.startsWith("AIza")) {
    throw new Error(
      `Error de Configuración Crítico:\n` +
      `La clave encontrada en ${source} parece ser una clave de Google Gemini (empieza por 'AIza').\n\n` +
      `Gemma requiere una clave de OpenRouter (empieza por 'sk-or-'). Por favor, actualiza tus variables de entorno.`
    );
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Vida Palabra Devocional"
      },
      body: JSON.stringify({
        "model": "google/gemma-3-27b-it:free",
        "messages": [
          { "role": "system", "content": system },
          { "role": "user", "content": prompt }
        ],
        "temperature": 0.3,
      }),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        const maskedKey = apiKey.length > 8 
          ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` 
          : "Clave muy corta";
        
        throw new Error(
          `Error de Autenticación OpenRouter (401):\n` +
          `• Fuente: ${source}\n` +
          `• Clave usada: ${maskedKey}\n` +
          `• Longitud: ${apiKey.length}\n\n` +
          `LA CLAVE NO ES VÁLIDA: Aunque es la variable correcta, OpenRouter la rechaza. Verifica que no haya espacios y que la clave esté activa en tu panel de OpenRouter.`
        );
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Error de OpenRouter (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    if (error.message.includes("401") || error.message.includes("Configuración")) throw error;
    throw new Error(`Error de conexión con Gemma (vía ${source}): ${error.message}`);
  }
};
