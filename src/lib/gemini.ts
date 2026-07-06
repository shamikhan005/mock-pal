const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

interface GeminiGenerateOptions {
  prompt: string;
  temperature?: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message: string; code: number };
}

export async function generateWithGemini<T = unknown>(
  options: GeminiGenerateOptions
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: options.prompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        response_mime_type: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[gemini] API error:", response.status, errorBody);
    throw new Error(`Gemini API returned ${response.status}: ${errorBody}`);
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    console.error("[gemini] API error response:", data.error);
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  try {
    return JSON.parse(text) as T;
  } catch (parseErr) {
    console.error("[gemini] Failed to parse JSON response:", text);
    throw new Error("Gemini returned invalid JSON");
  }
}
