export interface LiveSession {
  sessionId: string;       
  userId: string;
  interviewType: string;
  stage: "intro" | "question" | "followup" | "probe" | "close";
  questionsAsked: number;
  topicsCovered: string[];
  lastEvaluation: "strong" | "partial" | "weak" | "vague" | null;
  followupCount: number;  
}

const store = new Map<string, LiveSession>();

export function setLiveSession(vapiCallId: string, session: LiveSession) {
  store.set(vapiCallId, session);
}

export function getLiveSession(vapiCallId: string): LiveSession | undefined {
  return store.get(vapiCallId);
}

export function updateLiveSession(vapiCallId: string, updates: Partial<LiveSession>) {
  const existing = store.get(vapiCallId);
  if (existing) {
    store.set(vapiCallId, { ...existing, ...updates });
  }
}

export function deleteLiveSession(vapiCallId: string) {
  store.delete(vapiCallId);
}
