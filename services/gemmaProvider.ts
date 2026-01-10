
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callGemma = async (prompt: string, system: string): Promise<string> => {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${process.env.OpenRouter_API_KEY || ''}`,
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
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || response.statusText;
      throw new Error(`OpenRouter Error (${response.status}): ${msg}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Gemma Error: ${data.error.message || "Error desconocido"}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Gemma no devolvió contenido. Intenta con un pasaje más breve o cambia de modelo.");
    }

    return content;
  } catch (error: any) {
    if (error.name === 'TypeError') {
      throw new Error("Error de conexión: No se pudo contactar con OpenRouter. Revisa tu internet.");
    }
    throw error;
  }
};
