import type { BoardColor } from "@/domain/board/board-document";

export type ElementColors = { fill: string; stroke: string; text: string };

export const COLORS: Record<BoardColor, ElementColors> = {
  violet: { fill: "#ede9fe", stroke: "#7c3aed", text: "#3b0764" },
  purple: { fill: "#f3e8ff", stroke: "#9333ea", text: "#581c87" },
  indigo: { fill: "#e0e7ff", stroke: "#6366f1", text: "#312e81" },
  blue: { fill: "#dbeafe", stroke: "#3b82f6", text: "#1e3a8a" },
  sky: { fill: "#e0f2fe", stroke: "#0284c7", text: "#075985" },
  cyan: { fill: "#cffafe", stroke: "#0891b2", text: "#155e75" },
  teal: { fill: "#ccfbf1", stroke: "#14b8a6", text: "#134e4a" },
  emerald: { fill: "#d1fae5", stroke: "#059669", text: "#065f46" },
  green: { fill: "#dcfce7", stroke: "#22c55e", text: "#14532d" },
  lime: { fill: "#ecfccb", stroke: "#65a30d", text: "#3f6212" },
  yellow: { fill: "#fef3c7", stroke: "#f59e0b", text: "#78350f" },
  amber: { fill: "#fef3c7", stroke: "#d97706", text: "#78350f" },
  orange: { fill: "#ffedd5", stroke: "#f97316", text: "#7c2d12" },
  red: { fill: "#fee2e2", stroke: "#ef4444", text: "#7f1d1d" },
  rose: { fill: "#ffe4e6", stroke: "#e11d48", text: "#881337" },
  pink: { fill: "#fce7f3", stroke: "#ec4899", text: "#831843" },
  fuchsia: { fill: "#fae8ff", stroke: "#c026d3", text: "#701a75" },
  slate: { fill: "#e2e8f0", stroke: "#475569", text: "#0f172a" },
  grey: { fill: "#f3f4f6", stroke: "#94a3b8", text: "#334155" },
};

export const NOTE_GRADIENTS: Record<BoardColor, { from: string; to: string }> = {
  yellow: { from: "#fefce8", to: "#fef3c7" },
  amber: { from: "#fffbeb", to: "#fde68a" },
  orange: { from: "#fff7ed", to: "#ffedd5" },
  red: { from: "#fff1f2", to: "#fee2e2" },
  rose: { from: "#fff1f2", to: "#ffe4e6" },
  pink: { from: "#fdf2f8", to: "#fce7f3" },
  fuchsia: { from: "#fdf4ff", to: "#fae8ff" },
  purple: { from: "#faf5ff", to: "#f3e8ff" },
  violet: { from: "#f5f3ff", to: "#ede9fe" },
  indigo: { from: "#eef2ff", to: "#e0e7ff" },
  blue: { from: "#eff6ff", to: "#dbeafe" },
  sky: { from: "#f0f9ff", to: "#e0f2fe" },
  cyan: { from: "#ecfeff", to: "#cffafe" },
  teal: { from: "#f0fdfa", to: "#ccfbf1" },
  emerald: { from: "#ecfdf5", to: "#d1fae5" },
  green: { from: "#f0fdf4", to: "#dcfce7" },
  lime: { from: "#f7fee7", to: "#ecfccb" },
  slate: { from: "#f8fafc", to: "#f1f5f9" },
  grey: { from: "#fafafa", to: "#f4f4f5" },
};
