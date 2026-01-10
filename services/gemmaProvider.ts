
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callGemma = async (prompt: string, system: string): Promise<string> => {
  // Acceso directo (algunos entornos no permiten iterar process.env pero sí acceder por nombre)
  const key1 = (process.env as any).OPENROUTER_API_KEY;
  const key2 = (process.env as any).OpenRouter_API_KEY;
  const key3 = (process.env as any).API_KEY;

  let apiKey = "";
  let source = "";

  // Prioridad: 1. Claves específicas, 2. API_KEY genérica si tiene el formato correcto
  if (key1 && key1 !== "undefined" && key1.trim().startsWith("sk-or-")) {
    apiKey = key1.trim();
    source = "OPENROUTER_API_KEY";
  } else if (key2 && key2 !== "undefined" && key2.trim().startsWith("sk-or-")) {
    apiKey = key2.trim();
    source = "OpenRouter_API_KEY";
  } else if (key3 && key3.trim().startsWith("sk-or-")) {
    apiKey = key3.trim();
    source = "API_KEY";
  }

  if (!apiKey) {
    throw new Error(
      `SISTEMA NO DETECTA CLAVE DE OPENROUTER VÁLIDA:\n\n` +
      `ESTADO TÉCNICO:\n` +
      `• OPENROUTER_API_KEY: ${key1 ? `Detectada (L:${key1.length})` : 'No definida'}\n` +
      `• OpenRouter_API_KEY: ${key2 ? `Detectada (L:${key2.length})` : 'No definida'}\n` +
      `• API_KEY: ${key3 ? `Detectada (L:${key3.length})` : 'No definida'}\n\n` +
      `NOTA: Si usas OpenRouter, la clave DEBE empezar con 'sk-or-'.`
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
        "temperature": 0.2, // Reducido para evitar alucinaciones
        "max_tokens": 3000
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    if (error.message.includes("NO DETECTA")) throw error;
    throw new Error(`Error con Gemma (${source}): ${error.message}`);
  }
};
