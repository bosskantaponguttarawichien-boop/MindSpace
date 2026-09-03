import { NextResponse } from "next/server";
import { getAiProvider } from "@/infrastructure/ai/ai-provider";
import type { AiActionType } from "@/domain/ai/proposal-schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const contextText = typeof body.contextText === "string" ? body.contextText.slice(0, 50_000) : "";
    const action = typeof body.action === "string" ? (body.action as AiActionType) : undefined;
    const locale = typeof body.locale === "string" ? body.locale : "en";

    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter((m: unknown) => m && typeof m === "object" && typeof (m as { content?: unknown }).content === "string")
          .map((m: { role?: unknown; content: string }) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: m.content.slice(0, 4_000),
          }))
          .slice(-10)
      : [];

    const provider = getAiProvider();
    const result = await provider.chat({ contextText, messages, action, locale });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
