
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Intenta encontrar una clave válida de OpenRouter en el entorno.
 * Busca claves que empiecen por 'sk-or-' en cualquier variable disponible.
 */
const findOpenRouterKey = (): { key: string, source: string } | null => {
  // 1. Intentar por nombres específicos primero
  const specificKeys = ['OPENROUTER_API_KEY', 'OpenRouter_API_KEY'];
  for (const k of specificKeys) {
    const val = process.env[k];
    if (val && val !== "undefined" && val.trim().length > 0) {
      return { key: val.trim(), source: k };
    }
  }

  // 2. Escaneo profundo: Buscar cualquier variable que contenga una clave sk-or-
  // Esto ayuda si el usuario puso la clave en API_KEY o en un nombre con espacios
  try {
    const allEnvKeys = Object.keys(process.env);
    for (const k of allEnvKeys) {
      const val = process.env[k];
      if (typeof val === 'string' && val.trim().startsWith("sk-or-")) {
        return { key: val.trim(), source: `${k} (Detectada por contenido)` };
      }
    }
  } catch (e) {
    // Si Object.keys falla en este entorno, pasamos al siguiente paso
  }

  return null;
};

export const callGemma = async (prompt: string, system: string): Promise<string> => {
  const detected = findOpenRouterKey();
  
  if (!detected) {
    // Si no se encuentra, generamos un diagnóstico de qué variables SI ve el sistema
    const visibleVariables = Object.keys(process.env)
      .filter(k => k.toLowerCase().includes("api") || k.toLowerCase().includes("key"))
      .join(", ") || "Ninguna variable con 'API' o 'KEY' visible";

    throw new Error(
      `Error de Configuración Crítico:\n` +
      `No se encontró ninguna clave válida para OpenRouter (debe empezar con 'sk-or-').\n\n` +
      `SISTEMA VE ESTAS VARIABLES: [${visibleVariables}]\n\n` +
      `POR FAVOR:\n` +
      `1. Verifica que la clave en OPENROUTER_API_KEY sea la correcta.\n` +
      `2. Asegúrate de que no haya espacios antes o después del nombre de la variable.`
    );
  }

  // Validación extra: Si detectamos una clave de Google donde debería haber una de OpenRouter
  if (detected.key.startsWith("AIza")) {
    throw new Error(
      `Conflicto de Claves:\n` +
      `La clave usada (${detected.source}) es de Google Gemini.\n` +
      `Gemma en OpenRouter requiere una clave que empiece por 'sk-or-'.`
    );
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${detected.key}`,
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
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error(
          `Error 401 (No Autorizado):\n` +
          `Fuente: ${detected.source}\n` +
          `La clave fue enviada pero OpenRouter no la aceptó. Verifica que tu cuenta tenga créditos o que la clave no haya expirado.`
        );
      }
      throw new Error(`Error de OpenRouter (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    if (error.message.includes("Configuración") || error.message.includes("401")) throw error;
    throw new Error(`Error al conectar con Gemma (vía ${detected.source}): ${error.message}`);
  }
};
