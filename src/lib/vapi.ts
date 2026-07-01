const VAPI_BASE = "https://api.vapi.ai";

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
});

export interface CreateAssistantOptions {
  systemPrompt: string;
  firstMessage: string;
  candidateName: string;
  sessionId: string;
}

export async function createVapiAssistant(opts: CreateAssistantOptions) {
  const res = await fetch(`${VAPI_BASE}/assistant`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: `Interview - ${opts.candidateName} - ${Date.now()}`,
      model: {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
        systemPrompt: opts.systemPrompt,
      },
      voice: {
        provider: "vapi",
        voiceId: "Clara",
        version: 2,
      },
      metadata: {
        sessionId: opts.sessionId,
      },
      firstMessage: opts.firstMessage,
      firstMessageMode: "assistant-speaks-first",
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en",
      },
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 1800,
      endCallMessage: "Thank you for your time. Your feedback report is being generated now. Goodbye!",
      serverUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi/webhook`,
      serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi create assistant failed: ${err}`);
  }

  return res.json() as Promise<{ id: string }>;
}

export async function deleteVapiAssistant(assistantId: string) {
  await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
    method: "DELETE",
    headers: headers(),
  });
}

export async function getVapiCall(callId: string) {
  const res = await fetch(`${VAPI_BASE}/call/${callId}`, {
    headers: headers(),
  });
  return res.json();
}