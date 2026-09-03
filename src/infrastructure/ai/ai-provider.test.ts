import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { OpenAiChatGptProvider, GeminiAiProvider, getAiProvider } from "@/infrastructure/ai/ai-provider";

describe("ai-provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls OpenAI chat completions endpoint and parses response and proposal", async () => {
    const mockOpenAiResponse = {
      choices: [
        {
          message: {
            content: `Here are 2 new nodes:
\`\`\`json
{
  "title": "ChatGPT Expansion",
  "explanation": "Adding strategic goals",
  "elements": [
    { "kind": "note", "text": "Strategic Goal 1", "color": "blue" },
    { "kind": "note", "text": "Strategic Goal 2", "color": "teal" }
  ]
}
\`\`\`
Hope this helps!`,
          },
        },
      ],
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenAiResponse,
    });

    const provider = new OpenAiChatGptProvider("test-key", "gpt-4o-mini");
    const result = await provider.chat({
      contextText: "Central Plan",
      messages: [{ role: "user", content: "Expand my plan" }],
      action: "expand",
    });

    expect(result.provider).toBe("openai-gpt-4o-mini");
    expect(result.isMock).toBe(false);
    expect(result.proposal).toBeDefined();
    expect(result.proposal?.title).toBe("ChatGPT Expansion");
    expect(result.proposal?.elements).toHaveLength(2);
    expect(result.text).toContain("Here are 2 new nodes");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it("calls Gemini generateContent endpoint and parses parts and proposal", async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: `Gemini suggestions:
\`\`\`json
{
  "title": "Gemini Expansion",
  "explanation": "Adding sub-nodes",
  "elements": [
    { "kind": "note", "text": "Innovation", "color": "teal" }
  ]
}
\`\`\``,
              },
            ],
          },
        },
      ],
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeminiResponse,
    });

    const provider = new GeminiAiProvider("test-gemini-key", "gemini-3.6-flash");
    const result = await provider.chat({
      contextText: "Central Topic",
      messages: [{ role: "user", content: "Expand ideas" }],
    });

    expect(result.provider).toBe("google-gemini-3.6-flash");
    expect(result.isMock).toBe(false);
    expect(result.proposal?.title).toBe("Gemini Expansion");
    expect(result.proposal?.elements).toHaveLength(1);
  });

  it("getAiProvider selects GeminiAiProvider when GEMINI_API_KEY is configured", () => {
    const prevKey = process.env.GEMINI_API_KEY;
    const prevOpenAi = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.GEMINI_API_KEY = "test-gemini";

    const provider = getAiProvider();
    expect(provider).toBeInstanceOf(GeminiAiProvider);

    if (prevKey) process.env.GEMINI_API_KEY = prevKey;
    else delete process.env.GEMINI_API_KEY;
    if (prevOpenAi) process.env.OPENAI_API_KEY = prevOpenAi;
  });
});
