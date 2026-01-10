
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callGemma = async (prompt: string, system: string): Promise<string> => {
  try {
    // Buscamos la clave en todas las variantes posibles que el usuario tiene definidas en su entorno
    const apiKey = process.env.OPENROUTER_API_KEY || 
                   process.env.OpenRouter_API_KEY || 
                   process.env.API_KEY;
    
    // Verificamos que la clave exista y no sea un string vacío o el texto "undefined"
    if (!apiKey || apiKey.trim() === "" || apiKey === "undefined") {
      throw new Error("Configuración incompleta: No se encontró una clave válida en OPENROUTER_API_KEY o OpenRouter_API_KEY.");
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey.trim()}`, // .trim() es vital para evitar errores 401
        "HTTP-Referer": window.location.origin,
        "X-Title": "Vida Palabra"
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
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        // No es JSON
      }
      
      if (response.status === 401) {
        throw new Error(`Error de Autenticación OpenRouter (401): La clave en el entorno no está siendo aceptada o no se envió correctamente. Asegúrate de que la clave en el panel sea correcta.`);
      }
      
      throw new Error(`OpenRouter Error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Gemma Error: ${data.error.message || "Error desconocido"}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Gemma no devolvió contenido. Intenta de nuevo.");
    }

    return content;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("Error de conexión: No se pudo contactar con OpenRouter.");
    }
    throw error;
  }
};
