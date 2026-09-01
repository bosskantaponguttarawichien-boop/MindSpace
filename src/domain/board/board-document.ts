export type BoardElementId = `element:${string}`;
export type BoardConnectionId = `connection:${string}`;

export type BoardElement = {
  id: BoardElementId;
  kind: "text" | "note" | "rectangle" | "ellipse" | "diamond" | "triangle" | "draw" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color?: "violet" | "yellow" | "blue" | "green" | "grey";
  points?: number[];
  assetUrl?: string;
};

export type BoardConnection = {
  id: BoardConnectionId;
  fromId: BoardElementId;
  toId: BoardElementId;
};

export type BoardDocument = {
  version: 1;
  id: string;
  name: string;
  elements: BoardElement[];
  connections: BoardConnection[];
};

export function isBoardDocument(value: unknown): value is BoardDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BoardDocument>;
  return (
    candidate.version === 1 &&
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    Array.isArray(candidate.elements) &&
    Array.isArray(candidate.connections)
  );
}
