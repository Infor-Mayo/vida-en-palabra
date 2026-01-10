
export const cleanJsonResponse = (rawText: string): any => {
  if (!rawText || rawText.trim() === "") {
    throw new Error("La IA devolvió una respuesta vacía.");
  }

  try {
    let cleaned = rawText.trim();
    
    // 1. Intentar limpiar bloques de código markdown primero
    cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    // 2. Localizar el objeto JSON real buscando el primer '{' y el último '}'
    // Esto ignora cualquier charla previa que el modelo pueda incluir
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
      // Intentar con arrays por si acaso es un plan de lectura
      const startArr = cleaned.indexOf('[');
      const endArr = cleaned.lastIndexOf(']');
      if (startArr !== -1 && endArr !== -1) {
        return JSON.parse(cleaned.substring(startArr, endArr + 1));
      }
      throw new Error("No se encontró una estructura JSON válida en la respuesta de la IA.");
    }
    
    const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
    
    // 3. Intento de parseo
    const parsed = JSON.parse(jsonCandidate);
    
    // 4. Saneamiento de emergencia: asegurar campos críticos para evitar errores en la UI
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      parsed.keyVerses = Array.isArray(parsed.keyVerses) ? parsed.keyVerses : [];
      parsed.quiz = Array.isArray(parsed.quiz) ? parsed.quiz : [];
      parsed.reflectionPrompts = Array.isArray(parsed.reflectionPrompts) ? parsed.reflectionPrompts : [];
      parsed.dailyPlan = Array.isArray(parsed.dailyPlan) ? parsed.dailyPlan : [];
      parsed.title = parsed.title || "Devocional Sin Título";
      parsed.passageText = parsed.passageText || "";
      parsed.summary = parsed.summary || "";
      parsed.historicalContext = parsed.historicalContext || "";
      parsed.practicalApplication = parsed.practicalApplication || "";
    }
    
    return parsed;
  } catch (e: any) {
    // Segundo intento quitando caracteres de control invisibles
    try {
        let fallback = rawText.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        const s = fallback.indexOf('{');
        const eIdx = fallback.lastIndexOf('}');
        if (s === -1) throw new Error("Fallback failed");
        
        const parsed = JSON.parse(fallback.substring(s, eIdx + 1));
        
        if (parsed && typeof parsed === 'object') {
          parsed.keyVerses = parsed.keyVerses || [];
          parsed.quiz = parsed.quiz || [];
          parsed.reflectionPrompts = parsed.reflectionPrompts || [];
          parsed.dailyPlan = parsed.dailyPlan || [];
        }
        return parsed;
    } catch (innerError) {
        console.error("Error fatal de JSON. Texto original:", rawText);
        throw new Error(`La IA generó una respuesta que no pudo ser procesada. Intenta de nuevo o cambia de motor.`);
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
