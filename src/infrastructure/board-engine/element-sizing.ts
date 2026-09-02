import type { BoardElement } from "@/domain/board/board-document";

const MINIMUM_HEIGHT: Record<BoardElement["kind"], number> = {
  text: 28,
  note: 72,
  rectangle: 72,
  ellipse: 72,
  diamond: 72,
  triangle: 72,
  draw: 36,
  image: 80,
};

export function heightForEditedElement(element: BoardElement, textareaScrollHeight: number, viewportScale: number): number {
  const contentHeight = Math.ceil(textareaScrollHeight / viewportScale);
  return Math.max(MINIMUM_HEIGHT[element.kind], contentHeight);
}
