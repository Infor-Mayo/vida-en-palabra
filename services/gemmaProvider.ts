
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callGemma = async (prompt: string, system: string): Promise<string> => {
  let source = "ninguna";
  let rawKey: string | undefined = "";

  // Intentamos detectar qué variable tiene contenido real
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "undefined") {
    rawKey = process.env.OPENROUTER_API_KEY;
    source = "OPENROUTER_API_KEY (Mayúsculas)";
  } else if (process.env.OpenRouter_API_KEY && process.env.OpenRouter_API_KEY !== "undefined") {
    rawKey = process.env.OpenRouter_API_KEY;
    source = "OpenRouter_API_KEY (CamelCase)";
  } else if (process.env.API_KEY && process.env.API_KEY !== "undefined") {
    rawKey = process.env.API_KEY;
    source = "API_KEY (Genérica)";
  }

  const apiKey = rawKey?.trim() || "";
  
  if (!apiKey || apiKey === "") {
    throw new Error(`Error de Configuración: No se detectó ninguna clave para Gemma. Fuentes revisadas: OPENROUTER_API_KEY, OpenRouter_API_KEY y API_KEY. Por favor, asegúrate de que el valor no esté vacío en tu panel.`);
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
          `• Fuente detectada: ${source}\n` +
          `• Clave usada: ${maskedKey}\n` +
          `• Longitud: ${apiKey.length} caracteres\n\n` +
          `EL PROBLEMA: OpenRouter no reconoce esta clave. Verifica que sea una clave de 'OpenRouter' y no de 'Gemini', y que no tenga espacios accidentales.`
        );
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Error de OpenRouter (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    if (error.message.includes("401")) throw error;
    throw new Error(`Error de conexión con Gemma (vía ${source}): ${error.message}`);
  }
};
