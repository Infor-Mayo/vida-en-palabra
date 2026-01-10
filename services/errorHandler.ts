
export const cleanJsonResponse = (rawText: string): any => {
  if (!rawText || rawText.trim() === "") {
    throw new Error("La IA devolvió una respuesta vacía.");
  }

  try {
    let cleaned = rawText.trim();
    
    // Eliminar bloques de código markdown si existen
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    
    // Buscar el primer '{' y el último '}' por si el modelo incluyó texto basura
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
      // Intentar buscar corchetes por si es un array (para planes de lectura)
      const startArrIdx = cleaned.indexOf('[');
      const endArrIdx = cleaned.lastIndexOf(']');
      if (startArrIdx !== -1 && endArrIdx !== -1) {
          cleaned = cleaned.substring(startArrIdx, endArrIdx + 1);
          return JSON.parse(cleaned);
      }
      throw new Error("No se encontró un objeto JSON válido en la respuesta.");
    }
    
    cleaned = cleaned.substring(startIdx, endIdx + 1);
    return JSON.parse(cleaned);
  } catch (e: any) {
    console.error("Error al parsear JSON. Texto original:", rawText);
    throw new Error(`Error de formato (JSON): ${e.message}. El modelo envió datos corruptos. Prueba con un pasaje más corto.`);
  }
};

export const handleServiceError = (error: any, context: string = "proceso"): never => {
  // Errores que ya vienen con formato específico
  if (
    error.message.includes("Error de formato") || 
    error.message.includes("OpenRouter") || 
    error.message.includes("La IA devolvió") ||
    error.message.includes("Gemma")
  ) {
    throw error;
  }

  // Errores de cuota de Gemini
  if (error.message?.toLowerCase().includes("429") || error.message?.toLowerCase().includes("quota")) {
    throw new Error("Límite de cuota alcanzado. Cambia al modelo Gemma arriba o espera un minuto.");
  }
  
  // Error genérico con contexto
  throw new Error(`Error en el ${context}: ${error.message || "Desconocido"}. Intenta con un pasaje más breve.`);
};
