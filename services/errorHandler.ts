
export const cleanJsonResponse = (rawText: string): any => {
  if (!rawText || rawText.trim() === "") {
    throw new Error("La IA devolvió una respuesta vacía.");
  }

  try {
    let cleaned = rawText.trim();
    
    // 1. Eliminar bloques de código markdown
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    
    // 2. Localizar el objeto JSON real. 
    // Si hay basura o repeticiones (como el bug de "Amén"), buscamos el último cierre de llave válido.
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
      // Intentar con arrays
      const startArr = cleaned.indexOf('[');
      const endArr = cleaned.lastIndexOf(']');
      if (startArr !== -1 && endArr !== -1) {
        return JSON.parse(cleaned.substring(startArr, endArr + 1));
      }
      throw new Error("No se encontró estructura JSON.");
    }
    
    const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
    
    // 3. Intento de parseo
    return JSON.parse(jsonCandidate);
  } catch (e: any) {
    // Si el parseo falla porque la IA metió texto basura dentro de un campo (como viste en tu error),
    // intentamos una limpieza de emergencia de caracteres de control.
    try {
        let fallback = rawText.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        const s = fallback.indexOf('{');
        const eIdx = fallback.lastIndexOf('}');
        return JSON.parse(fallback.substring(s, eIdx + 1));
    } catch (innerError) {
        console.error("Error fatal de JSON. Texto original:", rawText);
        throw new Error(`El servidor de IA generó un texto corrupto o demasiado largo. Por favor, intenta de nuevo con un pasaje más corto.`);
    }
  }
};

export const handleServiceError = (error: any, context: string = "proceso"): never => {
  if (error.message.includes("Clave") || error.message.includes("Configuración") || error.message.includes("NO DETECTA")) {
    throw error;
  }
  
  if (error.message.includes("429") || error.message.includes("quota")) {
    throw new Error("Límite de cuota excedido. Prueba cambiando de modelo (Gemma/Gemini) en la configuración.");
  }
  
  throw new Error(`Error en ${context}: ${error.message}`);
};
