
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callGemma = async (prompt: string, system: string): Promise<string> => {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${process.env.OpenRouter_API_KEY || ''}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "Vida Palabra"
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
  
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "Error al conectar con Gemma 3");
  }
  return data.choices?.[0]?.message?.content || "";
};
