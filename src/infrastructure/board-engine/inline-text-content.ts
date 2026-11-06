import { parseMarkdown } from "@/domain/board/markdown";

/** Retain source syntax, including code fences, unless the corresponding visible row changes. */
export function editableSourceRows(source: string) {
  let code = false;
  return source.split("\n").flatMap((raw, index) => {
    if (raw.trim().startsWith("```")) { code = !code; return []; }
    if (code && raw === "") return [];
    return [{ raw, index }];
  });
}

export function updateSourceRow(raw: string, visible: string): string {
  if (visible === raw) return raw;
  const line = parseMarkdown(raw)[0];
  if (!line) return visible;
  const prefix = line.kind === "bullet" ? "• " : line.kind === "task" ? `${line.checked ? "☑" : "☐"} ` : line.kind === "quote" ? "│ " : "";
  if (visible === prefix + line.text) return raw;
  if (prefix && !visible.startsWith(prefix)) {
    if (line.kind === "task" && /^[☐☑] /.test(visible)) return `- [${visible.startsWith("☑") ? "x" : " "}] ${visible.slice(2)}`;
    return visible;
  }
  const text = prefix && visible.startsWith(prefix) ? visible.slice(prefix.length) : visible;
  const marker = raw.match(/^(#{1,3}\s+|[-*]\s+\[[ xX]\]\s+|[-*]\s+|>\s?)/)?.[0] ?? "";
  const body = raw.slice(marker.length);
  let start = 0;
  while (start < line.text.length && start < text.length && line.text[start] === text[start]) start++;
  let end = line.text.length, nextEnd = text.length;
  while (end > start && nextEnd > start && line.text[end - 1] === text[nextEnd - 1]) { end--; nextEnd--; }
  let position = 0;
  let inserted = false;
  const result = (body.match(/\*\*|`|[\s\S]/g) ?? []).map((token) => {
    if (token === "**" || token === "`") return token;
    const addition = position === start && !inserted ? text.slice(start, nextEnd) : "";
    if (position === start) inserted = true;
    const keep = position < start || position >= end;
    position++;
    return addition + (keep ? token : "");
  }).join("");
  return marker + result + (!inserted ? text.slice(start, nextEnd) : "");
}

export function sourceFromEditor(root: HTMLElement, source: string): string {
  const original = source.split("\n");
  const entries = Array.from(root.childNodes).flatMap((node) => {
    if (node instanceof HTMLElement) {
      const row = node.dataset.sourceRow;
      const value = node.innerText.replace(/\n$/, "");
      return [{ index: row === undefined ? undefined : Number(row), value }];
    }
    return node.textContent ? [{ index: undefined, value: node.textContent }] : [];
  });
  // The usual path retains every original byte outside the edited rows.
  const indices = editableSourceRows(source);
  if (entries.length === indices.length && entries.every((entry, i) => entry.index === indices[i]?.index && !entry.value.includes("\n"))) {
    for (const entry of entries) {
      if (entry.index !== undefined) original[entry.index] = updateSourceRow(original[entry.index] ?? "", entry.value);
    }
    return original.join("\n");
  }
  const visibleIndices = new Set(indices.map((row) => row.index));
  const result: string[] = [];
  let cursor = 0;
  for (const entry of entries) {
    if (entry.index !== undefined) {
      while (cursor < entry.index) {
        if (!visibleIndices.has(cursor)) result.push(original[cursor] ?? "");
        cursor++;
      }
      result.push(updateSourceRow(original[entry.index] ?? "", entry.value));
      cursor = Math.max(cursor, entry.index + 1);
    } else result.push(entry.value);
  }
  while (cursor < original.length) {
    if (!visibleIndices.has(cursor)) result.push(original[cursor] ?? "");
    cursor++;
  }
  return result.join("\n");
}
