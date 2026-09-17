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

  it("validates a proposal with a connector pathStyle (e.g. curved or elbow)", () => {
    const raw = {
      title: "Change connector shape",
      explanation: "Add a curved connector and switch existing ones to an elbow shape",
      connections: [
        { fromId: "elem-1", toIndex: 0, pathStyle: "curved" },
      ],
      updateConnections: [
        { pathStyle: "elbow" },
      ],
    };

    const validated = validateProposal(raw);
    expect(validated).not.toBeNull();
    expect(validated?.connections?.[0]?.pathStyle).toBe("curved");
    expect(validated?.updateConnections?.[0]?.pathStyle).toBe("elbow");
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


it("parses a fenced mind-map proposal with nested nodes and connections", () => {
  const response = parseAiResponse(`Here is a preview.

\`\`\`json
{
  "title": "Backend map",
  "explanation": "Organize the imported notes",
  "elements": [
    { "kind": "rectangle", "text": "Backend", "color": "indigo" },
    { "kind": "note", "text": "API", "color": "teal" },
    { "kind": "note", "text": "Database", "color": "teal" }
  ],
  "connections": [
    { "fromIndex": 0, "toIndex": 1 },
    { "fromIndex": 0, "toIndex": 2 }
  ]
}
\`\`\`
`);

  expect(response.text).toBe("Here is a preview.");
  expect(response.proposal?.elements).toHaveLength(3);
  expect(response.proposal?.connections).toHaveLength(2);
});

describe("proposal-schema full tool vocabulary", () => {
  it("accepts every board color, not just the mind-map subset", () => {
    const validated = validateProposal({
      title: "Recolor",
      explanation: "Use the full palette",
      updateElements: [{ id: "element:1", color: "emerald" }, { id: "element:2", color: "slate" }],
    });

    expect(validated?.updateElements?.map((update) => update.color)).toEqual(["emerald", "slate"]);
  });

  it("accepts a table element and pads ragged rows", () => {
    const validated = validateProposal({
      title: "Add a table",
      explanation: "Track the plan",
      elements: [{ kind: "table", text: "", tableData: [["Task", "Owner", "Due"], ["Research"]] }],
    });

    expect(validated?.elements?.[0]?.kind).toBe("table");
    expect(validated?.elements?.[0]?.tableData).toEqual([["Task", "Owner", "Due"], ["Research", "", ""]]);
  });

  it("keeps supported text styles and drops unsupported values", () => {
    const validated = validateProposal({
      title: "Restyle",
      explanation: "Bigger centered headings",
      updateElements: [{ id: "element:1", textStyle: { fontSize: 32, fontWeight: "heavy", textAlign: "center", verticalAlign: "middle" } }],
    });

    expect(validated?.updateElements?.[0]?.textStyle).toEqual({ fontSize: 32, textAlign: "center", verticalAlign: "middle" });
  });

  it("clamps out-of-range geometry instead of trusting the model", () => {
    const validated = validateProposal({
      title: "Move",
      explanation: "Reposition a node",
      updateElements: [{ id: "element:1", x: 9_999_999, y: -9_999_999, width: 1, height: 1_000_000 }],
    });

    expect(validated?.updateElements?.[0]).toMatchObject({ x: 20_000, y: -20_000, width: 24, height: 4_000 });
  });

  it("validates grouping, ungrouping, connector deletion and layout", () => {
    const validated = validateProposal({
      title: "Tidy up",
      explanation: "Group the branch and arrange it",
      groupElements: [{ elementIds: ["element:1", "element:2"] }, { elementIds: ["element:3"] }],
      ungroupElementIds: ["element:4", "not-an-id"],
      deleteConnectionIds: ["connection:1", "element:1"],
      layout: { direction: "tree", rootId: "element:1" },
    });

    expect(validated?.groupElements).toEqual([{ elementIds: ["element:1", "element:2"] }]);
    expect(validated?.ungroupElementIds).toEqual(["element:4"]);
    expect(validated?.deleteConnectionIds).toEqual(["connection:1"]);
    expect(validated?.layout).toEqual({ direction: "tree", rootId: "element:1" });
  });

  it("treats a connector between two existing elements as actionable on its own", () => {
    const validated = validateProposal({
      title: "Link nodes",
      explanation: "Connect the two existing ideas",
      connections: [{ fromId: "element:1", toId: "element:2" }],
    });

    expect(validated?.connections).toHaveLength(1);
  });

  it("rejects index-only connections with no proposed elements to point at", () => {
    expect(validateProposal({
      title: "Dangling link",
      explanation: "No elements proposed",
      connections: [{ fromIndex: 0, toIndex: 1 }],
    })).toBeNull();
  });

  it("rejects an unsupported element kind by falling back to a note", () => {
    const validated = validateProposal({
      title: "Draw something",
      explanation: "Freehand is human-only",
      elements: [{ kind: "draw", text: "Sketch" }],
    });

    expect(validated?.elements?.[0]?.kind).toBe("note");
  });
});
