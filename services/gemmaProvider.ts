
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callGemma = async (prompt: string, system: string): Promise<string> => {
  /**
   * Obtiene la clave de OpenRouter exclusivamente desde las variables específicas.
   * Se ha eliminado el acceso a API_KEY para evitar que el sistema intente usar
   * una clave de Gemini con el endpoint de OpenRouter.
   */
  const getGemmaKey = () => {
    const env = process.env as any;
    
    // Buscamos estrictamente nombres asociados a OpenRouter
    const key = env.OPENROUTER_API_KEY || env.OpenRouter_API_KEY;
    
    if (key && key !== "undefined" && key.trim().length > 0) {
      return key.trim();
    }
    return null;
  };

  const apiKey = getGemmaKey();
  console.log("ENV KEYS:", Object.keys(process.env));
  console.log("OPENROUTER:", process.env.OPENROUTER_API_KEY);


  if (!apiKey) {
    throw new Error(
      "ERROR DE CONFIGURACIÓN (Gemma): No se encontró una clave de OpenRouter.\n\n" +
      "Por favor, asegúrate de configurar la variable de entorno [OPENROUTER_API_KEY] en tu panel de control.\n" +
      "Nota: El modelo Gemma NO utilizará la variable genérica [API_KEY] por seguridad."
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
        "temperature": 0.2,
        "max_tokens": 3000
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Error de autenticación específico
      if (response.status === 401) {
        throw new Error("La clave configurada en [OPENROUTER_API_KEY] es inválida para OpenRouter.");
      }
      throw new Error(`OpenRouter (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    // Re-lanzar errores de configuración de forma limpia
    if (error.message.includes("ERROR DE CONFIGURACIÓN")) throw error;
    throw new Error(`Fallo al conectar con Gemma: ${error.message}`);
  }
};
