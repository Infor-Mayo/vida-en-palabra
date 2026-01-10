
/**
 * Extrae una llave específica de la variable combinada API_KEY.
 * Formato esperado: goo[LLAVE_GEMINI]-op[LLAVE_OPENROUTER]
 */
export const getSecretKey = (prefix: 'goo' | 'op'): string | null => {
  let masterKey = (process.env.API_KEY || '').trim();
  if(process.env.OpenRouter_API_KEY){
  console.log("or KEYS:", process.env.OpenRouter_API_KEY);
  }
  
  if (!masterKey) return null;

  // 1. Limpieza Ultra-Agresiva:
  // Eliminamos cualquier rastro de "API_KEY=", comillas de escape de shell o espacios
  // de forma iterativa por si vienen anidadas (ej: API_KEY="'value'")
  let previousKey = "";
  while (masterKey !== previousKey) {
    previousKey = masterKey;
    
    // Quitar prefijo literal si existe
    if (masterKey.toUpperCase().startsWith('API_KEY=')) {
      masterKey = masterKey.substring(8).trim();
    }
    
    // Quitar comillas al inicio y al final
    masterKey = masterKey.replace(/^["']|["']$/g, '').trim();
  }

  // 2. Búsqueda Manual (Más fiable que Regex para llaves con caracteres especiales)
  const marker = `${prefix}[`.toLowerCase();
  const lowerKey = masterKey.toLowerCase();
  const startIdx = lowerKey.indexOf(marker);
  
  if (startIdx !== -1) {
    const contentStart = startIdx + marker.length;
    // Buscamos el primer corchete de cierre DESPUÉS del marcador de apertura
    const endIdx = masterKey.indexOf(']', contentStart);
    
    if (endIdx !== -1) {
      const key = masterKey.substring(contentStart, endIdx).trim();
      if (key.length > 0) return key;
    }
  }
  
  // 3. Fallback inteligente para Gemini
  // Si buscas la llave de Google pero no hay formato de corchetes,
  // asumimos que la variable completa es la llave de Google.
  if (prefix === 'goo' && !lowerKey.includes('goo[')) {
    return masterKey;
  }

  return null;
};
