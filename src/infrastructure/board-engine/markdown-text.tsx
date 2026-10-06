import { memo } from "react";
import { Group, Text } from "react-konva";
import type { BoardElement } from "@/domain/board/board-document";
import { parseMarkdown } from "@/domain/board/markdown";
import { effectiveTextStyleFor, isShapeKind, supportsTextStyle } from "@/infrastructure/board-engine/board-elements";

export const MarkdownText = memo(function MarkdownText({ element, color }: { element: BoardElement; color: string }) {
  const lines = parseMarkdown(element.text);
  const isStructured = lines.length > 1 || lines.some((line) => line.kind !== "paragraph");
  const padding = element.kind === "text" ? 0 : 18;
  const textStyle = effectiveTextStyleFor(element);
  const defaultFontSize = supportsTextStyle(element) ? textStyle.fontSize : 16;
  const availableWidth = Math.max(20, element.width - padding * 2);

  const lineHeights = lines.map((line) => {
    const fontSize = element.kind === "text" || line.kind !== "heading" ? defaultFontSize : ({ 1: 24, 2: 20, 3: 18 }[line.level ?? 3]);
    const prefix = line.kind === "bullet" ? "• " : line.kind === "task" ? `${line.checked ? "☑" : "☐"} ` : line.kind === "quote" ? "│ " : "";
    const totalLength = (prefix + line.text).length;
    const charsPerLine = Math.max(1, Math.floor(availableWidth / (fontSize * 0.55)));
    const estimatedLines = Math.max(1, Math.ceil(totalLength / charsPerLine));
    const height = fontSize * 1.45 * estimatedLines;
    return { fontSize, prefix, height };
  });

  const totalTextHeight = lineHeights.reduce((sum, item) => sum + item.height, 0);

  const verticalAlign = textStyle.verticalAlign ?? "top";
  const titleOffset = (element.kind === "note" || isShapeKind(element.kind)) && element.title ? 40 : 0;
  let startY = padding + titleOffset;
  if (element.kind !== "text") {
    const availableHeight = Math.max(0, element.height - padding * 2 - titleOffset);
    if (verticalAlign === "middle") {
      startY = Math.max(padding + titleOffset, padding + titleOffset + (availableHeight - totalTextHeight) / 2);
    } else if (verticalAlign === "bottom") {
      startY = Math.max(padding + titleOffset, element.height - padding - totalTextHeight);
    }
  }

  const lineYPositions = lineHeights.reduce<number[]>((acc, item, index) => {
    const prevY = index === 0 ? startY : acc[index - 1]! + lineHeights[index - 1]!.height;
    acc.push(prevY);
    return acc;
  }, []);

  return (
    <Group listening={false}>
      {lines.map((line, index) => {
        const item = lineHeights[index]!;
        const lineY = lineYPositions[index]!;
        return (
          <Text
            key={`${line.kind}-${index}`}
            text={`${item.prefix}${line.text}`}
            x={padding}
            y={lineY}
            width={availableWidth}
            fill={color}
            fontFamily={line.kind === "code" ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "Geist, Noto Sans Thai, sans-serif"}
            fontSize={item.fontSize}
            fontStyle={(supportsTextStyle(element) && textStyle.fontWeight === "bold") || line.bold || line.kind === "heading" ? "bold" : "normal"}
            lineHeight={1.35}
            align={supportsTextStyle(element) ? textStyle.textAlign : element.kind === "note" || isStructured ? "left" : "center"}
            wrap="word"
            perfectDrawEnabled={false}
          />
        );
      })}
    </Group>
  );
});
