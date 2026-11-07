import type { Context } from "konva/lib/Context";
import { Ellipse, Group, Line, Path, Rect, Shape } from "react-konva";
import type { BoardElement } from "@/domain/board/board-document";
import { ELEMENT_APPEARANCE as STYLE, shapeCornerRadius } from "./element-appearance";
import type { ElementColors } from "./board-theme";

/** Fold + tape paper, shared by display, inline editing and canvas export. */
export function ElementSurface({ element, colors, reducedEffects }: {
  element: BoardElement;
  colors: ElementColors;
  reducedEffects: boolean;
}) {
  const { width: w, height: h, kind } = element;
  const shadow = {
    shadowColor: "#20252c", shadowOpacity: reducedEffects ? 0.06 : 0.1,
    shadowBlur: reducedEffects ? 2 : 4, shadowOffsetY: 2, shadowForStrokeEnabled: false,
  };
  if (kind === "note") {
    const radius = Math.min(STYLE.noteRadius, w / 4, h / 4);
    const fold = Math.min(STYLE.noteFold, w / 8, h / 8);
    const paper = `M ${radius} 0 H ${w - radius} Q ${w} 0 ${w} ${radius} V ${h - fold} L ${w - fold} ${h} H ${radius} Q 0 ${h} 0 ${h - radius} V ${radius} Q 0 0 ${radius} 0 Z`;
    const rail = `M ${STYLE.noteRail} 0 V ${h} Q 0 ${h} 0 ${h - radius} V ${radius} Q 0 0 ${STYLE.noteRail} 0 Z`;
    const tapeWidth = Math.min(STYLE.tapeWidth, w * 0.35);
    const tapeHeight = Math.min(STYLE.tapeHeight, h * 0.12);
    const tapeX = (w - tapeWidth) / 2;
    return (
      <Group>
        <Path data={paper} fill={STYLE.paper} stroke={STYLE.paperBorder} strokeWidth={0.8}
          {...shadow} perfectDrawEnabled={false} />
        <Path data={rail} fill={colors.stroke} listening={false} perfectDrawEnabled={false} />
        <PaperGrain width={w} height={h} reducedEffects={reducedEffects}
          clip={(context) => {
            context.moveTo(radius, 0);
            context.arcTo(w, 0, w, radius, radius);
            context.lineTo(w, h - fold);
            context.lineTo(w - fold, h);
            context.arcTo(0, h, 0, h - radius, radius);
            context.arcTo(0, 0, radius, 0, radius);
            context.closePath();
          }} />
        <Line points={[w - fold, h, w - fold, h - fold, w, h - fold]} closed
          fill={STYLE.fold} stroke={STYLE.paperBorder} strokeWidth={0.6}
          lineJoin="round" listening={false} perfectDrawEnabled={false} />
        <Line points={[w - fold + 1, h - 2, w - fold + 1, h - fold + 1, w - 2, h - fold + 1]}
          stroke={STYLE.paperHighlight} strokeWidth={0.8} opacity={0.8}
          listening={false} perfectDrawEnabled={false} />
        {/* The bounded custom shape keeps the raised tape out of resize/hit bounds. */}
        <Shape width={w} height={h} fill={STYLE.tape} stroke={STYLE.tapeBorder}
          strokeWidth={0.5} opacity={0.55} listening={false} perfectDrawEnabled={false}
          sceneFunc={(context, shape) => {
            context.beginPath();
            context.moveTo(tapeX + 1, -tapeHeight / 2);
            context.lineTo(tapeX + tapeWidth, -tapeHeight / 2 + 1);
            context.lineTo(tapeX + tapeWidth - 2, tapeHeight / 2);
            context.lineTo(tapeX, tapeHeight / 2 - 1);
            context.closePath();
            context.fillStrokeShape(shape);
          }} />
      </Group>
    );
  }

  const inset = Math.min(STYLE.shapeInset, w / 12, h / 12);
  function outline(padding: number, fill: string, stroke: string, strokeWidth: number) {
    const width = w - padding * 2, height = h - padding * 2;
    const common = { fill, stroke, strokeWidth, perfectDrawEnabled: false, ...(padding === 0 ? shadow : {}) };
    if (kind === "ellipse") {
      return <Ellipse x={w / 2} y={h / 2} radiusX={width / 2} radiusY={height / 2} {...common} />;
    }
    if (kind === "diamond" || kind === "triangle") {
      const points = kind === "diamond"
        ? [w / 2, padding, w - padding, h / 2, w / 2, h - padding, padding, h / 2]
        : [w / 2, padding, w - padding, h - padding, padding, h - padding];
      return <Line points={points} closed lineJoin="round" {...common} />;
    }
    return <Rect x={padding} y={padding} width={width} height={height}
      cornerRadius={Math.max(0, shapeCornerRadius(w, h) - padding)} {...common} />;
  }
  return (
    <Group>
      {outline(0, colors.fill, colors.stroke, STYLE.shapeBorder)}
      <Group listening={false}>
        {outline(inset, colors.fill, STYLE.paperHighlight, 1)}
        <PaperGrain width={w} height={h} reducedEffects={reducedEffects}
          clip={(context) => {
            if (kind === "ellipse") {
              context.ellipse(w / 2, h / 2, w / 2 - inset, h / 2 - inset, 0, 0, Math.PI * 2);
            } else if (kind === "diamond" || kind === "triangle") {
              context.moveTo(w / 2, inset);
              context.lineTo(w - inset, kind === "diamond" ? h / 2 : h - inset);
              context.lineTo(kind === "diamond" ? w / 2 : inset, h - inset);
              if (kind === "diamond") context.lineTo(inset, h / 2);
              context.closePath();
            } else {
              const r = Math.max(0, shapeCornerRadius(w, h) - inset);
              context.moveTo(inset + r, inset);
              context.arcTo(w - inset, inset, w - inset, h - inset, r);
              context.arcTo(w - inset, h - inset, inset, h - inset, r);
              context.arcTo(inset, h - inset, inset, inset, r);
              context.arcTo(inset, inset, w - inset, inset, r);
              context.closePath();
            }
          }} />
      </Group>
    </Group>
  );
}

/** Deterministic fibers in one bounded draw pass, without bitmap downloads. */
function PaperGrain({ width, height, reducedEffects, clip }: {
  width: number;
  height: number;
  reducedEffects: boolean;
  clip: (context: Context) => void;
}) {
  const count = Math.min(reducedEffects ? 40 : 80, Math.floor(width * height / 500));
  return (
    <Shape width={width} height={height} stroke={STYLE.grain} strokeWidth={0.5}
      opacity={0.055} listening={false} perfectDrawEnabled={false}
      sceneFunc={(context, shape) => {
        context.save();
        context.beginPath();
        clip(context);
        context.clip();
        context.beginPath();
        for (let i = 0; i < count; i++) {
          const x = ((i * 73.31 + 11.7) % 997) / 997 * width;
          const y = ((i * 137.13 + 29.3) % 991) / 991 * height;
          context.moveTo(x, y);
          context.lineTo(x + 1.5 + i % 4, y + (i % 3 - 1) * 0.5);
        }
        context.strokeShape(shape);
        context.restore();
      }} />
  );
}
