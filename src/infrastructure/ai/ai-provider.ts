import { parseAiResponse, type AiActionType, type AiProposal } from "@/domain/ai/proposal-schema";

export interface AiChatParams {
  contextText: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  action?: AiActionType;
  locale?: string;
}

export interface AiChatResult {
  text: string;
  proposal?: AiProposal;
  provider: string;
  isMock?: boolean;
}

export interface AiProvider {
  chat(params: AiChatParams): Promise<AiChatResult>;
}

const SYSTEM_PROMPT = `You are MindSpace AI, an intelligent personal knowledge workspace assistant for visual mind-mapping and whiteboarding.
You help users explore thoughts, summarize content, explain concepts, expand brainstorms, check completeness, build mind maps, and modify board elements/connections safely.

CRITICAL WORKFLOW:
When the user asks to add new concepts, expand ideas, create mind maps, or modify existing elements/connections on the board, ALWAYS provide:
1. A clear, helpful conversational explanation.
2. A structured proposal codeblock in JSON formatted like one of the following:

Case A: Proposing NEW nodes / connections (e.g. expand ideas, mind map):
\`\`\`json
{
  "title": "Short title for the proposed additions",
  "explanation": "Why these elements fit the current board",
  "elements": [
    { "kind": "note", "text": "Idea or topic text", "color": "violet" }
  ],
  "connections": [
    { "fromId": "optional-parent-id-if-attaching", "toIndex": 0 }
  ]
}
\`\`\`

Case B: Modifying EXISTING connectors (e.g. "เปลี่ยนหัว connector ทุกอันเป็นวงกลม", "change connector head to circle"):
\`\`\`json
{
  "title": "เปลี่ยนหัวลูกศรเชื่อมต่อทั้งหมดเป็นวงกลม",
  "explanation": "ปรับแต่งหัว Connector ของทุกเส้นเชื่อมต่อบนบอร์ดให้เป็นวงกลม (circle)",
  "updateConnections": [
    { "headType": "circle" }
  ]
}
\`\`\`

Case C: Modifying EXISTING elements (e.g. "เปลี่ยนสีการ์ด", "change element color"):
\`\`\`json
{
  "title": "เปลี่ยนสีองค์ประกอบ",
  "explanation": "ปรับเปลี่ยนสีขององค์ประกอบตามที่ผู้ใช้ร้องขอ",
  "updateElements": [
    { "color": "teal" }
  ]
}
\`\`\`

Allowed values:
- element kinds: note, text, rectangle, ellipse, diamond, triangle.
- colors: violet, yellow, blue, green, grey, red, orange, pink, teal, indigo.
- connector headType: arrow, triangle, circle, diamond.
- connector style: end, both, start, none.
- connector lineStyle: solid, dashed, dotted.

Keep explanations helpful and concise. Respond in the language used in the prompt/context (Thai if Thai is used, English otherwise).`;

export class OpenAiChatGptProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model = process.env.OPENAI_MODEL || "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(params: AiChatParams): Promise<AiChatResult> {
    const systemContent = `${SYSTEM_PROMPT}\n\nCurrent Board State:\n${params.contextText}${params.action ? `\n\nRequested Action: ${params.action}` : ""}`;

    const messages = [
      { role: "system", content: systemContent },
      ...params.messages.map((msg) => ({
        role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: msg.content,
      })),
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let message = `OpenAI API error (${response.status})`;
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson?.error?.message) {
          message = `OpenAI: ${errorJson.error.message}`;
        }
      } catch {
        message = `OpenAI API error (${response.status}): ${errorBody}`;
      }
      throw new Error(message);
    }

    const data = await response.json();
    const candidateText = data?.choices?.[0]?.message?.content ?? "";

    const parsed = parseAiResponse(candidateText);
    return {
      text: parsed.text,
      proposal: parsed.proposal,
      provider: `openai-${this.model}`,
      isMock: false,
    };
  }
}

export class GeminiAiProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model = process.env.GEMINI_MODEL || "gemini-3.6-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(params: AiChatParams): Promise<AiChatResult> {
    const promptParts = [
      `System Context:\n${SYSTEM_PROMPT}`,
      `Current Board State:\n${params.contextText}`,
    ];

    if (params.action) {
      promptParts.push(`Requested Action: ${params.action}`);
    }

    const contents = [
      {
        role: "user",
        parts: [{ text: promptParts.join("\n\n") }],
      },
      ...params.messages.map((msg) => ({
        role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: msg.content }],
      })),
    ];

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let message = `Gemini API error (${response.status})`;
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson?.error?.message) {
          message = `Gemini: ${errorJson.error.message}`;
        }
      } catch {
        message = `Gemini API error (${response.status}): ${errorBody}`;
      }
      throw new Error(message);
    }

    const data = await response.json();
    const parts = (data?.candidates?.[0]?.content?.parts ?? []) as Array<{ text?: string }>;
    const textParts = parts.map((p) => p.text || "").filter(Boolean);
    const candidateText = textParts.join("\n").trim();

    const parsed = parseAiResponse(candidateText);
    return {
      text: parsed.text,
      proposal: parsed.proposal,
      provider: `google-${this.model}`,
      isMock: false,
    };
  }
}

export class MockAiProvider implements AiProvider {
  async chat(params: AiChatParams): Promise<AiChatResult> {
    const isThai = params.locale === "th" || /[\u0E00-\u0E7F]/.test(params.contextText);
    const lastUserMessage = params.messages.filter((m) => m.role === "user").pop()?.content ?? "";

    if (params.action === "summarize") {
      const text = isThai
        ? "สรุปภาพรวมของบอร์ด: มีหัวข้อและบันทึกความคิดเชื่อมโยงกันอย่างเป็นระบบ โดยเน้นการจัดโครงสร้างเนื้อหาและการแบ่งหมวดหมู่ที่ชัดเจน"
        : "Board Summary: The board contains organized concepts and interconnected notes establishing clear topic hierarchies.";
      return { text, provider: "mock-ai", isMock: true };
    }

    if (params.action === "explain") {
      const text = isThai
        ? "คำอธิบายแนวคิด: เนื้อหาบนบอร์ดสะท้อนแนวคิดสำคัญที่มีความสัมพันธ์แบบเชื่อมโยงกัน เหมาะสำหรับใช้เป็นโครงร่างในการต่อยอดหรือทำความเข้าใจเชิงลึก"
        : "Concept Explanation: The current board elements outline fundamental ideas with direct relationships, forming a solid base for further exploration.";
      return { text, provider: "mock-ai", isMock: true };
    }

    if (params.action === "check") {
      const text = isThai
        ? "การตรวจสอบเนื้อหา: โครงสร้างบนบอร์ดมีความสมบูรณ์เบื้องต้น แนะนำให้เพิ่มเติมรายละเอียดเชิงปฏิบัติการหรือผลลัพธ์ที่คาดหวังในแต่ละกิ่งความคิด"
        : "Content Review: The board structure is logically consistent. Consider adding action items or concrete deliverables to each branch.";
      return { text, provider: "mock-ai", isMock: true };
    }

    if (params.action === "improve") {
      const text = isThai
        ? "ข้อเสนอแนะในการปรับปรุง: สามารถจัดกลุ่มหัวข้อย่อยให้กระชับขึ้น และใช้สีเพื่อจำแนกระดับความสำคัญหรือประเภทของงานได้ชัดเจนยิ่งขึ้น"
        : "Improvement Suggestion: Group secondary topics into distinct clusters and leverage color coding to distinguish priority levels.";
      return { text, provider: "mock-ai", isMock: true };
    }

    if (/เปลี่ยนหัว|connector|หัวลูกศร|วงกลม|circle|headtype/i.test(lastUserMessage)) {
      const headType = /วงกลม|circle/i.test(lastUserMessage) ? "circle" : "arrow";
      const proposal: AiProposal = {
        id: `proposal:${crypto.randomUUID()}`,
        title: isThai ? `เปลี่ยนหัวลูกศรทั้งหมดเป็น${headType === "circle" ? "วงกลม" : headType}` : `Change connector heads to ${headType}`,
        explanation: isThai
          ? `AI เสนอการปรับปรุงรูปแบบหัวลูกศร (Connector headType) ทุกเส้นบนบอร์ดให้เป็นแบบ ${headType}`
          : `AI proposes updating all connector endpoints on the board to ${headType}.`,
        updateConnections: [
          { headType },
        ],
      };
      const text = isThai
        ? `ได้ครับ ผมได้สร้างข้อเสนอในการปรับเปลี่ยนหัวเส้นเชื่อมต่อ (Connector) ให้เรียบร้อยแล้ว ตรวจสอบและกด "ยอมรับ (Approve)" เพื่อปรับบนบอร์ดได้เลยครับ`
        : `I have prepared a proposal to update your connector endpoints. Review and click "Approve" to apply the changes to your board.`;
      return { text, proposal, provider: "mock-ai", isMock: true };
    }

    // Default or expand / mindMap -> provide an insightful proposal
    const proposal: AiProposal = {
      id: `proposal:${crypto.randomUUID()}`,
      title: isThai ? "แตกกิ่งแนวคิดใหม่ 2 หัวข้อ" : "Expand with 2 Sub-topics",
      explanation: isThai
        ? "AI เสนอให้เพิ่มหัวข้อสำหรับการวางแผนและการประเมินผล เพื่อเติมเต็มความสมบูรณ์ของบอร์ด"
        : "AI proposes adding planning and evaluation nodes to enrich your board structure.",
      elements: [
        {
          kind: "note",
          text: isThai ? "แนวทางปฏิบัติการ (Action Plan)" : "Action Plan",
          color: "teal",
        },
        {
          kind: "note",
          text: isThai ? "ผลลัพธ์ที่คาดหวัง (Key Deliverables)" : "Key Deliverables",
          color: "orange",
        },
      ],
      connections: [
        { toIndex: 0 },
        { toIndex: 1 },
      ],
    };

    const text = isThai
      ? `AI ได้วิเคราะห์บริบทของบอร์ดแล้ว: ขอเสนอแนะให้ต่อยอดด้วยหัวข้อเพิ่มเติมด้านล่างนี้ คุณสามารถกด "ยอมรับ (Approve)" เพื่อเพิ่มลงบอร์ด หรือกด "ปฏิเสธ (Reject)" เพื่อยกเลิกได้`
      : `AI analyzed your board: here are recommended additions to expand your ideas. Review the proposal below and click "Approve" to add them to your board, or "Reject" to dismiss.`;

    return {
      text: lastUserMessage ? `${isThai ? "คำตอบสำหรับ: " : "Response for: "}${lastUserMessage}\n\n${text}` : text,
      proposal,
      provider: "mock-ai",
      isMock: true,
    };
  }
}

export function getAiProvider(): AiProvider {
  const providerPreference = process.env.AI_PROVIDER?.trim().toLowerCase();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (providerPreference === "openai" && openAiKey) {
    return new OpenAiChatGptProvider(openAiKey);
  }
  if (providerPreference === "gemini" && geminiKey) {
    return new GeminiAiProvider(geminiKey);
  }

  if (geminiKey) {
    return new GeminiAiProvider(geminiKey);
  }
  if (openAiKey) {
    return new OpenAiChatGptProvider(openAiKey);
  }
  return new MockAiProvider();
}
