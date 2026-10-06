import { Fragment, type ReactNode } from "react";

// Renders the small Markdown subset that AI replies use (headings, lists, quotes,
// code fences, bold/italic/inline code) as React elements. No HTML is injected,
// so untrusted model output cannot add markup or scripts.

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "code"; lines: string[] };

const bulletPattern = /^\s*[-*+]\s+(.*)$/;
const orderedPattern = /^\s*\d+[.)]\s+(.*)$/;
const headingPattern = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const quotePattern = /^>\s?(.*)$/;

export function parseChatMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      blocks.push({ kind: "code", lines: code });
      continue;
    }

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    const heading = line.match(headingPattern);
    if (heading) {
      const level = Math.min(3, (heading[1] ?? "#").length) as 1 | 2 | 3;
      blocks.push({ kind: "heading", level, text: heading[2] ?? "" });
      index += 1;
      continue;
    }

    const listMatch = line.match(bulletPattern) ?? line.match(orderedPattern);
    if (listMatch) {
      const ordered = !bulletPattern.test(line);
      const pattern = ordered ? orderedPattern : bulletPattern;
      const items: string[] = [];
      while (index < lines.length) {
        const item = (lines[index] ?? "").match(pattern);
        if (!item) break;
        items.push(item[1] ?? "");
        index += 1;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    if (quotePattern.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length) {
        const item = (lines[index] ?? "").match(quotePattern);
        if (!item) break;
        quoted.push(item[1] ?? "");
        index += 1;
      }
      blocks.push({ kind: "quote", lines: quoted });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const next = lines[index] ?? "";
      if (
        next.trim() === "" ||
        next.trim().startsWith("```") ||
        headingPattern.test(next) ||
        bulletPattern.test(next) ||
        orderedPattern.test(next) ||
        quotePattern.test(next)
      ) {
        break;
      }
      paragraph.push(next);
      index += 1;
    }
    blocks.push({ kind: "paragraph", lines: paragraph });
  }

  return blocks;
}

const inlinePattern = /(`[^`]+`|\*\*[^*]+?\*\*|__[^_]+?__|\*[^*\s][^*]*?\*|_[^_\s][^_]*?_)/g;

export function renderInline(text: string): ReactNode[] {
  return text.split(inlinePattern).map((part, index) => {
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.95em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.length > 4 && ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__")))) {
      return <strong key={index}>{renderInline(part.slice(2, -2))}</strong>;
    }
    if (part.length > 2 && ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function renderLines(lines: string[]) {
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {renderInline(line)}
    </Fragment>
  ));
}

export function ChatMarkdown({ content }: { content: string }) {
  const blocks = parseChatMarkdown(content);

  return (
    <div className="space-y-2 break-words">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading":
            return (
              <p key={index} className={`font-semibold ${block.level === 1 ? "text-sm" : ""}`}>
                {renderInline(block.text)}
              </p>
            );
          case "list": {
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag key={index} className={`space-y-1 pl-4 ${block.ordered ? "list-decimal" : "list-disc"}`}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </ListTag>
            );
          }
          case "quote":
            return (
              <blockquote key={index} className="border-l-2 border-border pl-2 text-muted-foreground">
                {renderLines(block.lines)}
              </blockquote>
            );
          case "code":
            return (
              <pre key={index} className="overflow-x-auto rounded-md bg-background/70 p-2 font-mono text-[11px]">
                <code>{block.lines.join("\n")}</code>
              </pre>
            );
          case "paragraph":
            return <p key={index}>{renderLines(block.lines)}</p>;
        }
      })}
    </div>
  );
}
