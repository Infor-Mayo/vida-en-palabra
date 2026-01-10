
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callGemma = async (prompt: string, system: string): Promise<string> => {
  try {
    // Usamos específicamente la llave para OpenRouter solicitada
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Configuración incompleta: No se encontró la variable OPENROUTER_API_KEY para usar Gemma.");
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}`,
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
        // No es JSON, usar statusText
      }
      
      if (response.status === 401) {
        throw new Error(`Error de Autenticación OpenRouter (401): La clave en OPENROUTER_API_KEY es inválida.`);
      }
      
      throw new Error(`OpenRouter Error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Gemma Error: ${data.error.message || "Error desconocido"}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Gemma no devolvió contenido. Intenta con un pasaje más breve.");
    }

    return content;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("Error de conexión: No se pudo contactar con OpenRouter.");
    }
    throw error;
  }
};
