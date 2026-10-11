import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ChatMarkdown, parseChatMarkdown } from "@/features/ai/components/chat-markdown";

describe("parseChatMarkdown", () => {
  it("groups headings, lists, paragraphs and code fences", () => {
    const blocks = parseChatMarkdown("# Title\n\nIntro line\nsecond line\n\n*   one\n*   two\n\n1. first\n2. second\n\n```\ncode\n```");
    expect(blocks).toEqual([
      { kind: "heading", level: 1, text: "Title" },
      { kind: "paragraph", lines: ["Intro line", "second line"] },
      { kind: "list", ordered: false, items: ["one", "two"] },
      { kind: "list", ordered: true, items: ["first", "second"] },
      { kind: "code", lines: ["code"] },
    ]);
  });
});

describe("ChatMarkdown", () => {
  it("renders bold, lists and inline code instead of raw markers", () => {
    const { container } = render(
      <ChatMarkdown content={"Mind map about **Parts of Speech**\n\n*   **Noun (คำนาม):** details\n*   `code` and *italic*"} />,
    );

    expect(container.textContent).not.toContain("**");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("strong")?.textContent).toBe("Parts of Speech");
    expect(container.querySelector("li strong")?.textContent).toBe("Noun (คำนาม):");
    expect(container.querySelector("code")?.textContent).toBe("code");
    expect(container.querySelector("em")?.textContent).toBe("italic");
  });

  it("does not interpret HTML in model output", () => {
    const { container } = render(<ChatMarkdown content={"<img src=x onerror=alert(1)> **ok**"} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img src=x onerror=alert(1)>");
  });
});
