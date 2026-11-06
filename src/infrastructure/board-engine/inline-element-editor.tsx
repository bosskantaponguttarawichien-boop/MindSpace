import { useLayoutEffect, useRef, useState, type KeyboardEventHandler } from "react";
import type { BoardElement } from "@/domain/board/board-document";
import { elementColors } from "./element-appearance";
import { editableSourceRows, sourceFromEditor } from "./inline-text-content";
import { textLayout } from "./text-layout";

type Props = {
  element: BoardElement;
  viewport: { x: number; y: number; scale: number };
  label: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
};

/** The browser owns the editable DOM until blur; React must not reset the caret on input. */
export function InlineElementEditor({ element, viewport, label, onChange, onBlur, onKeyDown }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [initial] = useState(() => ({ source: element.text, layout: textLayout(element), sourceRows: editableSourceRows(element.text) }));
  const layout = initial.layout;
  useLayoutEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return (
    <div className="absolute z-20" style={{ left: viewport.x + element.x * viewport.scale,
      top: viewport.y + element.y * viewport.scale, width: element.width, height: element.height,
      transform: `scale(${viewport.scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
      <div ref={ref} role="textbox" aria-label={label} aria-multiline contentEditable="plaintext-only"
        suppressContentEditableWarning spellCheck={false} className="outline-none"
        style={{ position: "absolute", left: layout.x, top: layout.y, width: layout.width,
          minHeight: 22, maxHeight: Math.max(22, element.height - layout.y - 18), overflow: "auto",
          color: elementColors(element).text, fontSize: 16, textAlign: layout.align, pointerEvents: "auto",
          whiteSpace: "pre-wrap", overflowWrap: "break-word", scrollbarWidth: "none" }}
        onInput={(event) => onChange(sourceFromEditor(event.currentTarget, initial.source))}
        onBlur={onBlur} onKeyDown={onKeyDown}>
        {layout.rows.map((row, index) => (
          <div key={index} data-source-row={initial.sourceRows[index]?.index}
            style={{ minHeight: row.height, fontFamily: row.fontFamily, fontSize: row.fontSize,
              fontWeight: row.fontWeight, lineHeight: 1.35 }}>
            {row.prefix + row.text || <br />}
          </div>
        ))}
      </div>
    </div>
  );
}
