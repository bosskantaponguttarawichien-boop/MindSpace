import { memo } from "react";
import { Group, Text } from "react-konva";
import type { BoardElement } from "@/domain/board/board-document";
import { textLayout } from "./text-layout";

export const MarkdownText = memo(function MarkdownText({ element, color }: { element: BoardElement; color: string }) {
  const layout = textLayout(element);
  let y = layout.y;
  return (
    <Group listening={false}>
      {layout.rows.map((row, index) => {
        const lineY = y;
        y += row.height;
        return <Text key={index} text={row.prefix + row.text} x={layout.x} y={lineY}
          width={layout.width} fill={color} fontFamily={row.fontFamily} fontSize={row.fontSize}
          fontStyle={row.fontWeight} lineHeight={1.35} align={layout.align} wrap="word" perfectDrawEnabled={false} />;
      })}
    </Group>
  );
});
