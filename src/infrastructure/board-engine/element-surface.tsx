import type { ReactElement } from "react";
import { Ellipse, Group, Line, Path, Rect } from "react-konva";
import type { BoardElement } from "@/domain/board/board-document";
import { ELEMENT_APPEARANCE as STYLE, shapeCornerRadius } from "./element-appearance";
import type { ElementColors } from "./board-theme";

/** C2 paper notes and H2-A geometric surfaces, shared by display and editing. */
export function ElementSurface({ element, colors, reducedEffects }: {
  element: BoardElement;
  colors: ElementColors;
  reducedEffects: boolean;
}) {
  const { width: w, height: h, kind } = element;
  if (kind === "note") {
    const radius = Math.min(STYLE.noteRadius, w / 4, h / 4);
    const fold = Math.min(STYLE.noteFold, w / 8, h / 8);
    const paper = `M ${radius} 0 H ${w - radius} Q ${w} 0 ${w} ${radius} V ${h - fold} L ${w - fold} ${h} H ${radius} Q 0 ${h} 0 ${h - radius} V ${radius} Q 0 0 ${radius} 0 Z`;
    const rail = `M ${STYLE.noteRail} 0 V ${h} Q 0 ${h} 0 ${h - radius} V ${radius} Q 0 0 ${STYLE.noteRail} 0 Z`;
    return (
      <Group>
        <Path data={paper} fill={STYLE.paper} stroke={STYLE.paperBorder} strokeWidth={0.8}
          shadowColor="#20252c" shadowOpacity={reducedEffects ? 0 : 0.09}
          shadowBlur={reducedEffects ? 0 : 5} shadowOffsetY={2}
          shadowForStrokeEnabled={false} perfectDrawEnabled={false} />
        <Path data={rail} fill={colors.stroke} listening={false} perfectDrawEnabled={false} />
        <Line points={[w - fold, h, w - fold, h - fold, w, h - fold]} closed
          fill={colors.stroke} opacity={0.8} listening={false} perfectDrawEnabled={false} />
      </Group>
    );
  }

  let accent: string;
  let surface: ReactElement;
  if (kind === "ellipse") {
    const rx = w / 2, ry = h / 2;
    const point = (angle: number) => [rx + rx * Math.cos(angle), ry + ry * Math.sin(angle)];
    const start = point(Math.PI * 1.08), end = point(Math.PI * 1.28);
    accent = `M ${start[0]} ${start[1]} A ${rx} ${ry} 0 0 1 ${end[0]} ${end[1]}`;
    surface = <Ellipse x={rx} y={ry} radiusX={rx} radiusY={ry} fill={colors.fill} stroke={colors.stroke} strokeWidth={STYLE.shapeBorder} perfectDrawEnabled={false} />;
  } else if (kind === "diamond" || kind === "triangle") {
    const points = kind === "diamond" ? [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2] : [w / 2, 0, w, h, 0, h];
    accent = kind === "diamond"
      ? `M ${w * 0.35} ${h * 0.15} L ${w / 2} 0 L ${w * 0.6} ${h * 0.1}`
      : `M ${w * 0.4} ${h * 0.2} L ${w / 2} 0 L ${w * 0.57} ${h * 0.14}`;
    surface = <Line points={points} closed fill={colors.fill} stroke={colors.stroke} strokeWidth={STYLE.shapeBorder} lineJoin="round" perfectDrawEnabled={false} />;
  } else {
    const r = shapeCornerRadius(w, h);
    const extension = Math.min(10, w / 12, h / 12);
    accent = `M 0 ${r + extension} V ${r} A ${r} ${r} 0 0 1 ${r} 0 H ${r + extension}`;
    surface = <Rect width={w} height={h} cornerRadius={r} fill={colors.fill} stroke={colors.stroke} strokeWidth={STYLE.shapeBorder} perfectDrawEnabled={false} />;
  }
  return (
    <Group>
      {surface}
      <Path data={accent} stroke={colors.stroke} strokeWidth={STYLE.shapeAccent}
        lineCap="round" lineJoin="round" listening={false} perfectDrawEnabled={false} />
    </Group>
  );
}
