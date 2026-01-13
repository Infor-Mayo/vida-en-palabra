
// Normaliza texto para búsqueda (quita tildes, caracteres especiales y convierte a minúsculas)
const normalize = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita tildes
    .replace(/[^a-z0-9\s]/g, ""); // Solo letras y números
};

// Utilidad para escapar strings para regex
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Genera un patrón regex flexible para nombres de libros con posibles errores de codificación
const getFlexibleSearchPattern = (book: string, chapter: number): RegExp => {
    // 1. Limpiar el nombre del libro de números iniciales para procesar la parte de texto
    const match = book.match(/^(\d+)?\s*(.+)$/);
    if (!match) return new RegExp(`${escapeRegExp(book)}\\s+${chapter}`, 'i');

    const numPrefix = match[1];
    const textPart = match[2];

    // Lista de vocales a flexibilizar (incluyendo versiones acentuadas)
    // Estrategia: Reemplazar cualquier vocal por un comodín que acepte:
    // - La vocal
    // - Nada (caso de caracteres perdidos por encoding)
    // - Caracteres basura
    
    let regexStr = "";
    if (numPrefix) {
        regexStr += numPrefix + "\\s+"; 
    }

    // Construimos el regex letra por letra para el nombre
    for (const char of textPart) {
        if (/[aeiouáéíóúü]/i.test(char)) {
            regexStr += ".?"; // Acepta 0 o 1 caracter cualquiera en lugar de la vocal
        } else if (char === ' ') {
             regexStr += "\\s+";
        } else {
            regexStr += escapeRegExp(char);
        }
    }

    // Añadir el capítulo al final
    // Buscamos "Libro Capítulo"
    regexStr += `\\s+${chapter}`;
    
    // Boundary para asegurar que el número termina ahí
    regexStr += "\\b"; 

    console.log(`[bibleSearch] Patrón generado para '${book} ${chapter}': ${regexStr}`);
    return new RegExp(regexStr, 'i');
};

export const extractRelevantContextStructured = (
  fullText: string,
  book: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number
): string => {
  console.log(`[bibleSearch] Buscando estructurado: Libro='${book}', Cap=${chapter}, Versos=${verseStart}-${verseEnd}`);

  // 1. Crear patrón de búsqueda flexible
  const searchRegex = getFlexibleSearchPattern(book, chapter);
  
  // 2. Buscar en el texto completo
  const match = searchRegex.exec(fullText);
  
  if (match) {
    const index = match.index;
    console.log(`[bibleSearch] Capítulo encontrado en índice: ${index}`);
    
    // 3. Buscar el final del capítulo (inicio del siguiente)
    const nextChapterRegex = getFlexibleSearchPattern(book, chapter + 1);
    
    // Buscamos adelante desde donde encontramos el actual
    // Usamos un offset seguro para no encontrarnos a nosotros mismos si el regex es muy laxo
    let nextMatch = nextChapterRegex.exec(fullText.substring(index + 50)); 
    
    let endIndex = -1;
    if (nextMatch) {
        endIndex = index + 50 + nextMatch.index;
        console.log(`[bibleSearch] Fin detectado (Siguiente capítulo) en: ${endIndex}`);
    } else {
        // Fallback: Límite fijo si es el último capítulo o no se detecta el siguiente
        console.log(`[bibleSearch] No se detectó siguiente capítulo. Usando límite fijo.`);
        endIndex = index + 30000; // ~30k caracteres es bastante seguro para un capítulo largo
    }
    
    endIndex = Math.min(endIndex, fullText.length);
    
    // Extraer texto
    let rawContext = fullText.substring(index, endIndex);
    
    // 4. Filtrar versículos si se piden
    if (verseStart) {
        // Patrón para buscar versículos: ":N" o " N" al inicio de línea
        // En los archivos RV60 el formato observado es "Gnesis 1:1"
        // Buscamos ":verseStart"
        const versePattern = new RegExp(`:\\s*${verseStart}\\b`);
        const verseMatch = versePattern.exec(rawContext);
        
        if (verseMatch) {
             // Retrocedemos para incluir el nombre del libro y capítulo en cada versículo si es posible,
             // o simplemente cortamos desde un poco antes.
             const cutStart = Math.max(0, verseMatch.index - 50); 
             rawContext = rawContext.substring(cutStart);
             console.log(`[bibleSearch] Recortado inicio al versículo ${verseStart}`);
        }
        
        if (verseEnd) {
             // Buscar el versículo final + 1
             const verseEndPattern = new RegExp(`:\\s*${verseEnd + 1}\\b`);
             const verseEndMatch = verseEndPattern.exec(rawContext);
             if (verseEndMatch) {
                 rawContext = rawContext.substring(0, verseEndMatch.index);
                 console.log(`[bibleSearch] Recortado final al versículo ${verseEnd}`);
             }
        }
    }

    // Truncar si sigue siendo excesivo (protección final)
    if (rawContext.length > 50000) {
        rawContext = rawContext.substring(0, 50000) + "\n... (truncado por seguridad)";
    }
    
    console.log(`[bibleSearch] Contexto extraído longitud final: ${rawContext.length}`);
    return `CONTEXTO BÍBLICO (${book.toUpperCase()} ${chapter}):\n...\n${rawContext}\n...`;
  }

  console.log(`[bibleSearch] ERROR: NO SE ENCONTRÓ EL CAPÍTULO: ${book} ${chapter}`);
  return "";
};

export const extractRelevantContext = (fullText: string, query: string): string => {
  console.log(`[bibleSearch] Buscando texto libre: "${query}"`);
  const normalizedQuery = normalize(query);

  // Lista de libros simple para detección en texto libre
  const BIBLE_BOOKS_SIMPLE = [
    "genesis", "exodo", "levitico", "numeros", "deuteronomio", 
    "josue", "jueces", "rut", "1 samuel", "2 samuel", "1 reyes", "2 reyes", 
    "1 cronicas", "2 cronicas", "esdras", "nehemias", "ester", "job", 
    "salmos", "proverbios", "eclesiastes", "cantares", "isaias", "jeremias", 
    "lamentaciones", "ezequiel", "daniel", "oseas", "joel", "amos", "abdias", 
    "jonas", "miqueas", "nahum", "habacuc", "sofanias", "hageo", "zacarias", "malaquias",
    "mateo", "marcos", "lucas", "juan", "hechos", "romanos", "1 corintios", 
    "2 corintios", "galatas", "efesios", "filipenses", "colosenses", 
    "1 tesalonicenses", "2 tesalonicenses", "1 timoteo", "2 timoteo", "tito", 
    "filemon", "hebreos", "santiago", "1 pedro", "2 pedro", "1 juan", "2 juan", 
    "3 juan", "judas", "apocalipsis"
  ];

  // 1. Intentar detectar Libro y Capítulo en la query
  let detectedBook = BIBLE_BOOKS_SIMPLE.find(book => normalizedQuery.includes(book));
  
  if (detectedBook) {
    // Buscar número
    const splitParts = normalizedQuery.split(detectedBook);
    const afterBook = splitParts.length > 1 ? splitParts[1] : "";
    const chapterMatch = afterBook.match(/(\d+)/);
    
    if (chapterMatch) {
      const chapter = parseInt(chapterMatch[1]);
      console.log(`[bibleSearch] Detectado en query libre: ${detectedBook} ${chapter}`);
      
      // Redirigir a la búsqueda estructurada
      return extractRelevantContextStructured(fullText, detectedBook, chapter);
    }
  }

  // 2. Fallback: Búsqueda de texto literal (snippet)
  console.log("No se detectó referencia específica. Buscando coincidencias literales...");
  
  if (query.length > 5) {
    // Intentar buscar la frase literal (normalizada parcialmente)
    // Esto es difícil con texto sucio.
    // Buscamos un fragmento de la query
    const snippet = query.substring(0, Math.min(query.length, 20));
    const searchIndex = fullText.toLowerCase().indexOf(snippet.toLowerCase());
    
    if (searchIndex !== -1) {
        console.log(`[bibleSearch] Fragmento encontrado en índice ${searchIndex}`);
        const start = Math.max(0, searchIndex - 1000);
        const length = 10000;
        let context = fullText.substring(start, start + length);
        return `CONTEXTO ENCONTRADO POR BÚSQUEDA DE TEXTO:\n...\n${context}\n...`;
    }
  }

  return "";
};
