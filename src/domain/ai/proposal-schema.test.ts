import { describe, expect, it } from "vitest";
import { parseAiResponse, validateProposal } from "@/domain/ai/proposal-schema";

describe("proposal-schema", () => {
  it("validates a well-formed proposal object with elements", () => {
    const raw = {
      title: "Add 2 sub-nodes",
      explanation: "Expanding the central concept with marketing and engineering branches.",
      elements: [
        { kind: "note", text: "Marketing Strategy", color: "orange" },
        { kind: "rectangle", text: "Architecture Plan", color: "blue" },
      ],
      connections: [
        { fromId: "elem-1", toIndex: 0 },
        { fromId: "elem-1", toIndex: 1 },
      ],
    };

    const validated = validateProposal(raw);
    expect(validated).not.toBeNull();
    expect(validated?.title).toBe("Add 2 sub-nodes");
    expect(validated?.elements).toHaveLength(2);
    expect(validated?.elements?.[0]?.text).toBe("Marketing Strategy");
    expect(validated?.connections).toHaveLength(2);
  });

  it("validates a proposal with updateConnections (e.g. change heads to circle)", () => {
    const raw = {
      title: "Change connector heads to circle",
      explanation: "Update all connectors to have circle endpoints",
      updateConnections: [
        { headType: "circle" },
      ],
    };

    const validated = validateProposal(raw);
    expect(validated).not.toBeNull();
    expect(validated?.title).toBe("Change connector heads to circle");
    expect(validated?.updateConnections).toHaveLength(1);
    expect(validated?.updateConnections?.[0]?.headType).toBe("circle");
  });

  it("rejects proposals without any elements or updates", () => {
    const raw = {
      title: "Empty proposal",
      explanation: "No elements or updates included",
      elements: [],
    };
    expect(validateProposal(raw)).toBeNull();
  });

  it("parses conversational response containing a JSON proposal codeblock", () => {
    const rawResponse = `Here is what I recommend for your board:

We can branch out into Marketing and Engineering.

\`\`\`json
{
  "title": "Expanded Concepts",
  "explanation": "Add 2 new nodes branching from your main idea",
  "elements": [
    { "kind": "note", "text": "Marketing", "color": "orange" },
    { "kind": "note", "text": "Engineering", "color": "blue" }
  ]
}
\`\`\`

Let me know if you would like more details.`;

    const parsed = parseAiResponse(rawResponse);
    expect(parsed.proposal).toBeDefined();
    expect(parsed.proposal?.title).toBe("Expanded Concepts");
    expect(parsed.proposal?.elements).toHaveLength(2);
    expect(parsed.text).toContain("Here is what I recommend for your board");
    expect(parsed.text).not.toContain("```json");
  });

  it("parses conversational response with updateConnections proposal", () => {
    const rawResponse = `ได้ครับ ผมได้เตรียมข้อเสนอในการปรับเปลี่ยนหัวลูกศรให้แล้วครับ

\`\`\`json
{
  "title": "เปลี่ยนหัวลูกศรทุกอันเป็นวงกลม",
  "explanation": "เปลี่ยนหัว connector ทุกอันบนบอร์ดเป็นวงกลม (circle)",
  "updateConnections": [
    { "headType": "circle" }
  ]
}
\`\`\`

กด Approve เพื่อยืนยันได้เลยครับ`;

    const parsed = parseAiResponse(rawResponse);
    expect(parsed.proposal).toBeDefined();
    expect(parsed.proposal?.title).toBe("เปลี่ยนหัวลูกศรทุกอันเป็นวงกลม");
    expect(parsed.proposal?.updateConnections?.[0]?.headType).toBe("circle");
    expect(parsed.text).toContain("ได้ครับ");
  });
});
