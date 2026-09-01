import { ArrowLeft, ArrowLeftRight, ArrowRight, ChevronRight, Circle, Diamond, Dot, Eraser, Hand, Minus, MoreHorizontal, MousePointer2, Pencil, RectangleHorizontal, StickyNote, Triangle, Type } from "lucide-react";
import type { BoardColor, ConnectionHeadType, ConnectionLineStyle, ConnectionStyle } from "@/domain/board/board-document";
import type { BoardTool } from "@/infrastructure/board-engine/board-engine";
import type { MessageKey } from "@/lib/i18n/messages";

export type ToolButton = { id: BoardTool; label: MessageKey; icon: typeof MousePointer2; shortcut?: string };

export const pointerTools: ToolButton[] = [
  { id: "select", label: "select", icon: MousePointer2, shortcut: "V" },
  { id: "hand", label: "hand", icon: Hand, shortcut: "H" },
];

export const contentTools: ToolButton[] = [
  { id: "text", label: "text", icon: Type, shortcut: "T" },
  { id: "note", label: "note", icon: StickyNote, shortcut: "N" },
];

export const shapeTools: ToolButton[] = [
  { id: "rectangle", label: "rectangle", icon: RectangleHorizontal, shortcut: "R" },
  { id: "ellipse", label: "circle", icon: Circle, shortcut: "O" },
  { id: "diamond", label: "diamond", icon: Diamond },
  { id: "triangle", label: "triangle", icon: Triangle },
];

export const inkTools: ToolButton[] = [
  { id: "draw", label: "draw", icon: Pencil, shortcut: "D" },
  { id: "eraser", label: "eraser", icon: Eraser, shortcut: "E" },
];

export type ConnectionOption<TValue> = { value: TValue; label: MessageKey; icon: typeof MousePointer2 };

export const connectionEnds: ConnectionOption<ConnectionStyle>[] = [
  { value: "end", label: "arrowEnd", icon: ArrowRight },
  { value: "both", label: "arrowBoth", icon: ArrowLeftRight },
  { value: "start", label: "arrowStart", icon: ArrowLeft },
  { value: "none", label: "arrowNone", icon: Minus },
];

export const connectionLineStyles: ConnectionOption<ConnectionLineStyle>[] = [
  { value: "solid", label: "lineSolid", icon: Minus },
  { value: "dashed", label: "lineDashed", icon: MoreHorizontal },
  { value: "dotted", label: "lineDotted", icon: Dot },
];

export const connectionHeadTypes: ConnectionOption<ConnectionHeadType>[] = [
  { value: "arrow", label: "headArrow", icon: ChevronRight },
  { value: "triangle", label: "headTriangle", icon: Triangle },
  { value: "circle", label: "headCircle", icon: Circle },
  { value: "diamond", label: "headDiamond", icon: Diamond },
];

export const colorClasses: Record<BoardColor, string> = {
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  indigo: "bg-indigo-500",
  blue: "bg-blue-500",
  sky: "bg-sky-500",
  cyan: "bg-cyan-500",
  teal: "bg-teal-500",
  emerald: "bg-emerald-500",
  green: "bg-green-500",
  lime: "bg-lime-500",
  yellow: "bg-yellow-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  rose: "bg-rose-500",
  pink: "bg-pink-500",
  fuchsia: "bg-fuchsia-500",
  slate: "bg-slate-600",
  grey: "bg-slate-400",
};

export const colorLabels: Record<BoardColor, MessageKey> = {
  violet: "colorViolet",
  purple: "colorPurple",
  indigo: "colorIndigo",
  blue: "colorBlue",
  sky: "colorSky",
  cyan: "colorCyan",
  teal: "colorTeal",
  emerald: "colorEmerald",
  green: "colorGreen",
  lime: "colorLime",
  yellow: "colorYellow",
  amber: "colorAmber",
  orange: "colorOrange",
  red: "colorRed",
  rose: "colorRose",
  pink: "colorPink",
  fuchsia: "colorFuchsia",
  slate: "colorSlate",
  grey: "colorGrey",
};
