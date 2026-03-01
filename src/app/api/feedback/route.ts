import { logFeedback } from "@/lib/langsmith";

export async function POST(req: Request) {
  const { runId, score, comment, correction } = await req.json();

  if (!runId || typeof score !== "number") {
    return Response.json(
      { error: "runId and score are required" },
      { status: 400 },
    );
  }

  await logFeedback({ runId, score, comment, correction });

  return Response.json({ ok: true });
}
