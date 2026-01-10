
/**
 * Extrae una llave específica de la variable combinada API_KEY.
 * Formato esperado: goo[LLAVE_GEMINI]-op[LLAVE_OPENROUTER]
 */
export const getSecretKey = (prefix: 'goo' | 'op'): string | null => {
  let masterKey = (process.env.API_KEY || '').trim();
  
  if (!masterKey) return null;

  // 1. Limpieza: Eliminar prefijo "API_KEY=" si el usuario lo pegó accidentalmente en el valor
  if (masterKey.toUpperCase().startsWith('API_KEY=')) {
    masterKey = masterKey.substring(8).trim();
  }

  // 2. Eliminar comillas dobles o simples al inicio y final que pueden venir del entorno
  masterKey = masterKey.replace(/^["']|["']$/g, '');

  // 3. Regex robusta: busca el prefijo, corchete de apertura, 
  // captura todo lo que NO sea un corchete de cierre ([^\]]+), y cierra.
  // El flag 'i' permite que no importe si el prefijo es minúscula o mayúscula.
  const regex = new RegExp(`${prefix}\\[([^\\]]+)\\]`, 'i');
  const match = masterKey.match(regex);
  
  if (match && match[1]) {
    const key = match[1].trim();
    return key.length > 0 ? key : null;
  }
  
  // 4. Fallback especial para Google Gemini
  // Si buscamos 'goo' pero la llave no tiene el formato de corchetes, 
  // asumimos que el usuario puso la llave de Google directamente sin el formato macabro.
  if (prefix === 'goo' && !masterKey.toLowerCase().includes('goo[')) {
    return masterKey;
  }

  return null;
};
