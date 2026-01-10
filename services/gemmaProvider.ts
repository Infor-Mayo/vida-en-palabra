
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callGemma = async (prompt: string, system: string): Promise<string> => {
  // 1. Diagnóstico preventivo: Intentamos capturar los metadatos de las variables
  const getMeta = (keyName: string) => {
    const val = (process.env as any)[keyName];
    return {
      exists: !!val && val !== "undefined",
      type: typeof val,
      len: val ? String(val).length : 0,
      prefix: val && String(val).startsWith("sk-or-") ? "Correcto (sk-or-)" : "Incorrecto o no empieza con sk-or-"
    };
  };

  const diag = {
    OR_MAYA: getMeta("OPENROUTER_API_KEY"),
    OR_CAMEL: getMeta("OpenRouter_API_KEY"),
    API_GENERIC: getMeta("API_KEY")
  };

  // 2. Selección de la clave (Prioridad OpenRouter)
  let apiKey = "";
  let source = "";

  if (diag.OR_MAYA.exists) {
    apiKey = String((process.env as any)["OPENROUTER_API_KEY"]).trim();
    source = "OPENROUTER_API_KEY";
  } else if (diag.OR_CAMEL.exists) {
    apiKey = String((process.env as any)["OpenRouter_API_KEY"]).trim();
    source = "OpenRouter_API_KEY";
  } else if (diag.API_GENERIC.exists && String((process.env as any)["API_KEY"]).startsWith("sk-or-")) {
    apiKey = String((process.env as any)["API_KEY"]).trim();
    source = "API_KEY (Detectada como OpenRouter)";
  }

  // 3. Si no hay clave válida, lanzamos el informe técnico detallado
  if (!apiKey || apiKey === "") {
    throw new Error(
      `SISTEMA NO DETECTA CLAVE DE OPENROUTER:\n\n` +
      `INFORME TÉCNICO DE VARIABLES:\n` +
      `• OPENROUTER_API_KEY: [Existe: ${diag.OR_MAYA.exists}, Tipo: ${diag.OR_MAYA.type}, Longitud: ${diag.OR_MAYA.len}]\n` +
      `• OpenRouter_API_KEY: [Existe: ${diag.OR_CAMEL.exists}, Tipo: ${diag.OR_CAMEL.type}, Longitud: ${diag.OR_CAMEL.len}]\n` +
      `• API_KEY (Genérica): [Existe: ${diag.API_GENERIC.exists}, Tipo: ${diag.API_GENERIC.type}, Longitud: ${diag.API_GENERIC.len}]\n\n` +
      `Si los valores dicen 'false' o '0', el entorno no está pasando las variables al código.`
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
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error(
          `Error 401 (No Autorizado):\n` +
          `Fuente: ${source} (Longitud: ${apiKey.length})\n` +
          `La clave se envió pero OpenRouter la rechazó. Verifica que la clave sea de OpenRouter y no de Gemini.`
        );
      }
      throw new Error(`Error OpenRouter (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    if (error.message.includes("SISTEMA NO DETECTA") || error.message.includes("401")) throw error;
    throw new Error(`Fallo de conexión con Gemma (${source}): ${error.message}`);
  }
};
