
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callGemma = async (prompt: string, system: string): Promise<string> => {
  // Función interna para obtener la clave justo antes de la llamada (evita problemas de scope en build)
  const getGemmaKey = () => {
    const env = process.env as any;
    // Intentamos primero con nombres específicos, luego con el genérico API_KEY
    const key = env.OPENROUTER_API_KEY || env.OpenRouter_API_KEY ;
    
    if (key && key !== "undefined" && key.trim().length > 0) {
      return key.trim();
    }
    return null;
  };

  const apiKey = getGemmaKey();

  if (!apiKey) {
    throw new Error(
      "ERROR DE CONFIGURACIÓN: No se encontró una clave de API.\n" +
      "Asegúrate de haber configurado la variable de entorno [API_KEY] en tu panel de control."
    );
  }

  // Si la clave es sospechosamente corta (L:14 como mencionaste), informamos al usuario
  if (apiKey.length < 20) {
    console.warn(`Advertencia: La clave detectada es muy corta (${apiKey.length} caracteres). Podría ser inválida.`);
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
      // Si recibimos un 401, es que la clave que pasamos no era para OpenRouter
      if (response.status === 401) {
        throw new Error("Clave de API no autorizada. Asegúrate de que la variable [API_KEY] sea una clave válida de OpenRouter (sk-or-...).");
      }
      throw new Error(`OpenRouter (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    throw new Error(error.message.includes("ERROR DE") ? error.message : `Fallo al conectar con Gemma: ${error.message}`);
  }
};
