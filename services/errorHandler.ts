
export const cleanJsonResponse = (rawText: string): any => {
  if (!rawText || rawText.trim() === "") {
    throw new Error("La IA devolvió una respuesta vacía.");
  }

  try {
    let cleaned = rawText.trim();
    
    // 1. Intentar limpiar bloques de código markdown primero
    cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    // 2. Localizar el objeto JSON real
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
      const startArr = cleaned.indexOf('[');
      const endArr = cleaned.lastIndexOf(']');
      if (startArr !== -1 && endArr !== -1) {
        return JSON.parse(cleaned.substring(startArr, endArr + 1));
      }
      throw new Error("No se encontró una estructura JSON válida.");
    }
    
    const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
    
    // 3. Intento de parseo
    const parsed = JSON.parse(jsonCandidate);
    
    // 4. Saneamiento de emergencia
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      parsed.keyVerses = Array.isArray(parsed.keyVerses) ? parsed.keyVerses : [];
      parsed.reflectionPrompts = Array.isArray(parsed.reflectionPrompts) ? parsed.reflectionPrompts : [];
      parsed.dailyPlan = Array.isArray(parsed.dailyPlan) ? parsed.dailyPlan : [];
      parsed.title = parsed.title || "Devocional Sin Título";
      parsed.passageText = parsed.passageText || "";
      
      // Saneamiento profundo de Quiz
      if (Array.isArray(parsed.quiz)) {
        parsed.quiz = parsed.quiz.map((q: any) => {
          if (q.type === 'true-false' && (!q.options || q.options.length < 2)) {
            q.options = ['Verdadero', 'Falso'];
          }
          return q;
        });
      } else {
        parsed.quiz = [];
      }
    }
    
    return parsed;
  } catch (e: any) {
    try {
        let fallback = rawText.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        const s = fallback.indexOf('{');
        const eIdx = fallback.lastIndexOf('}');
        const parsed = JSON.parse(fallback.substring(s, eIdx + 1));
        return parsed;
    } catch (innerError) {
        console.error("Error fatal de JSON:", rawText);
        throw new Error(`La IA generó una respuesta que no pudo ser procesada. Intenta de nuevo.`);
    }
  }
};

export const handleServiceError = (error: any, context: string = "proceso"): never => {
  if (error.message.includes("Clave") || error.message.includes("Configuración")) throw error;
  if (error.message.includes("429") || error.message.includes("quota")) {
    throw new Error("Límite de cuota excedido. Prueba cambiando de motor en la configuración.");
  }
  throw new Error(`Error en ${context}: ${error.message}`);
};
