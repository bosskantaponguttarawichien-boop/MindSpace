export type MarkdownLine = {
  text: string;
  kind: "paragraph" | "heading" | "bullet" | "task" | "quote" | "code";
  level?: 1 | 2 | 3;
  checked?: boolean;
  bold?: boolean;
};

function stripInlineMarkdown(value: string) {
  return value.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1");
}

export function parseMarkdown(text: string): MarkdownLine[] {
  let inCodeBlock = false;
  return text.split("\n").map((raw) => {
    if (raw.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return { kind: "code" as const, text: "" };
    }
    if (inCodeBlock) return { kind: "code" as const, text: raw };
    const heading = raw.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const marks = heading[1] ?? "#";
      return { kind: "heading" as const, level: marks.length as 1 | 2 | 3, text: stripInlineMarkdown(heading[2] ?? ""), bold: true };
    }
    const task = raw.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (task) return { kind: "task" as const, checked: (task[1] ?? "").toLowerCase() === "x", text: stripInlineMarkdown(task[2] ?? "") };
    const bullet = raw.match(/^[-*]\s+(.+)$/);
    if (bullet) return { kind: "bullet" as const, text: stripInlineMarkdown(bullet[1] ?? "") };
    const quote = raw.match(/^>\s?(.+)$/);
    if (quote) return { kind: "quote" as const, text: stripInlineMarkdown(quote[1] ?? "") };
    return { kind: "paragraph" as const, text: stripInlineMarkdown(raw), bold: /\*\*.+?\*\*/.test(raw) };
  }).filter((line) => line.text !== "" || line.kind === "paragraph");
}
