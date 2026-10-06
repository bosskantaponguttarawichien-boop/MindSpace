import { memo, useMemo } from "react";
import { Group, Line, Path, Rect, Text } from "react-konva";
import type { BoardElement } from "@/domain/board/board-document";
import { effectiveTextStyleFor } from "@/infrastructure/board-engine/board-elements";
import type { ElementColors } from "@/infrastructure/board-engine/board-theme";

export const BoardTable = memo(function BoardTable({
  element,
  colors,
  onCellDblClick,
  onTitleDblClick,
  titleEditing,
}: {
  element: BoardElement;
  colors: ElementColors;
  onCellDblClick: (r: number, c: number, text: string) => void;
  onTitleDblClick: () => void;
  titleEditing: boolean;
}) {
  const rows = Math.max(1, element.rows ?? 3);
  const cols = Math.max(1, element.cols ?? 3);
  const titleHeight = element.title || titleEditing ? 38 : 0;
  const cellWidth = element.width / cols;
  const cellHeight = Math.max(1, element.height - titleHeight) / rows;

  const data: string[][] = useMemo(() => {
    if (element.tableData && element.tableData.length > 0) {
      return element.tableData;
    }
    const lines = (element.text || "").split("\n");
    return Array.from({ length: rows }, (_, r) => {
      const lineCells = lines[r] ? lines[r].split("|").map((cell) => cell.trim()) : [];
      return Array.from({ length: cols }, (_, c) => lineCells[c] ?? "");
    });
  }, [element.tableData, element.text, rows, cols]);

  const vLines: number[] = useMemo(() => {
    const list: number[] = [];
    for (let c = 1; c < cols; c++) list.push(c * cellWidth);
    return list;
  }, [cols, cellWidth]);

  const hLines: number[] = useMemo(() => {
    const list: number[] = [];
    for (let r = 1; r < rows; r++) list.push(r * cellHeight);
    return list;
  }, [rows, cellHeight]);

  const textStyle = effectiveTextStyleFor(element);
  const fontSize = element.textStyle?.fontSize ?? Math.max(11, Math.min(14, cellHeight * 0.35));

  return (
    <Group>
      <Rect
        width={element.width}
        height={element.height}
        fill="#ffffff"
        stroke={colors.stroke}
        strokeWidth={2}
        cornerRadius={18}
        shadowColor="#0f172a"
        shadowOpacity={0.06}
        shadowBlur={6}
        shadowOffsetY={3}
        shadowForStrokeEnabled={false}
        perfectDrawEnabled={false}
      />
      <Rect
        x={0}
        y={titleHeight}
        width={element.width}
        height={cellHeight}
        fill={colors.stroke}
        opacity={0.35}
        cornerRadius={titleHeight ? 0 : [18, 18, 0, 0]}
        perfectDrawEnabled={false}
      />
      <Line
        points={[0, titleHeight + cellHeight, element.width, titleHeight + cellHeight]}
        stroke={colors.stroke}
        strokeWidth={1.5}
        opacity={0.4}
        perfectDrawEnabled={false}
      />
      {Array.from({ length: rows - 1 }, (_, index) => {
        const r = index + 1;
        if (r % 2 === 0) {
          return (
            <Rect
              key={`zebra-${r}`}
              x={0}
              y={titleHeight + r * cellHeight}
              width={element.width}
              height={cellHeight}
              fill={colors.fill}
              opacity={0.35}
              cornerRadius={r === rows - 1 ? [0, 0, 18, 18] : 0}
              perfectDrawEnabled={false}
            />
          );
        }
        return null;
      })}
      {vLines.map((x, i) => (
        <Line
          key={`v-${i}`}
          points={[x, titleHeight, x, element.height]}
          stroke={colors.stroke}
          strokeWidth={1}
          opacity={0.16}
          perfectDrawEnabled={false}
        />
      ))}
      {hLines.map((y, i) => (
        <Line
          key={`h-${i + 1}`}
          points={[0, titleHeight + y, element.width, titleHeight + y]}
          stroke={colors.stroke}
          strokeWidth={1}
          opacity={0.18}
          perfectDrawEnabled={false}
        />
      ))}
      {data.slice(0, rows).flatMap((row, r) =>
        row.slice(0, cols).map((cellText, c) => (
          <Group
            key={`cell-${r}-${c}`}
            x={c * cellWidth}
            y={titleHeight + r * cellHeight}
            width={cellWidth}
            height={cellHeight}
            onDblClick={(event) => {
              event.cancelBubble = true;
              onCellDblClick(r, c, cellText);
            }}
          >
            <Rect width={cellWidth} height={cellHeight} fill="transparent" perfectDrawEnabled={false} hitStrokeWidth={0} />
            <Text
              width={cellWidth}
              height={cellHeight}
              text={cellText}
              padding={8}
              fill={r === 0 ? "#0f172a" : "#1e293b"}
              fontFamily="Geist, Noto Sans Thai, sans-serif"
              fontSize={r === 0 ? Math.max(12, fontSize) : fontSize}
              fontStyle={r === 0 || textStyle.fontWeight === "bold" ? "bold" : "normal"}
              lineHeight={1.25}
              verticalAlign={textStyle.verticalAlign ?? "middle"}
              align={textStyle.textAlign}
              wrap="word"
              perfectDrawEnabled={false}
            />
          </Group>
        ))
      )}
      {titleHeight ? (
        <Group onDblClick={(event) => { event.cancelBubble = true; onTitleDblClick(); }}>
          <Rect width={element.width} height={titleHeight} fill="transparent" perfectDrawEnabled={false} />
          <Rect x={12} y={7} width={24} height={24} cornerRadius={6} fill={colors.fill} perfectDrawEnabled={false} />
          <Path x={17} y={12} data="M1 1H15V15H1z M1 5H15 M5 1V15" stroke={colors.stroke} strokeWidth={1.5} listening={false} perfectDrawEnabled={false} />
          <Text x={44} y={9} width={element.width - 55} text={titleEditing ? "" : element.title ?? ""} fill="#1e293b" fontFamily="Geist, Noto Sans Thai, sans-serif" fontSize={16} fontStyle="bold" perfectDrawEnabled={false} />
          <Line points={[0, titleHeight, element.width, titleHeight]} stroke={colors.stroke} opacity={0.25} strokeWidth={1} perfectDrawEnabled={false} />
        </Group>
      ) : null}
    </Group>
  );
});
