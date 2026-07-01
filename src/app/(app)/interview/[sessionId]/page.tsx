import { Suspense } from "react";
import InterviewRoom from "@/components/interview-room";

export default async function InterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ assistantId?: string; interviewer?: string }>;
}) {
  const { sessionId } = await params;
  const { assistantId, interviewer } = await searchParams;

  if (!assistantId) {
    return (
      <div className="min-h-screen bg-[#FAF6F1] flex items-center justify-center">
        <p className="text-[#6B7280]">Invalid session. <a href="/setup" className="text-[#C5943A] underline">Start over</a></p>
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <InterviewRoom
        sessionId={sessionId}
        assistantId={assistantId}
        interviewerName={interviewer || "Alex"}
      />
    </Suspense>
  );
}
