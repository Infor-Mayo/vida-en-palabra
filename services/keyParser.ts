
/**
 * Extrae una llave específica de la variable combinada API_KEY.
 * Formato esperado: goo[LLAVE_GEMINI]-op[LLAVE_OPENROUTER]
 */
export const getSecretKey = (prefix: 'goo' | 'op'): string | null => {
  const masterKey = process.env.API_KEY || '';
  
  // Regex para encontrar contenido dentro de corchetes después del prefijo
  const regex = new RegExp(`${prefix}\\[(.*?)\\]`);
  const match = masterKey.match(regex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Fallback: si no hay formato especial, devolvemos la llave tal cual para Gemini 
  // (por si el usuario solo puso la de Google sin el formato macabro)
  if (prefix === 'goo' && !masterKey.includes('goo[')) {
    return masterKey.trim();
  }

  return null;
};
