import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, type FirestoreError } from "firebase/firestore";
import type { BoardConnection, BoardDocument, BoardElement } from "@/domain/board/board-document";
import { getFirebaseServices } from "@/infrastructure/firebase/client";

export type StoredBoard = {
  id: string;
  name: string;
  document: BoardDocument;
};

const colors = new Set(["violet", "yellow", "blue", "green", "grey"]);
const kinds = new Set(["text", "note", "rectangle", "ellipse", "draw"]);

function isBoardElement(value: unknown): value is BoardElement {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BoardElement>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.kind === "string" && kinds.has(candidate.kind) &&
    [candidate.x, candidate.y, candidate.width, candidate.height].every((field) => typeof field === "number" && Number.isFinite(field)) &&
    typeof candidate.text === "string" &&
    (candidate.color === undefined || (typeof candidate.color === "string" && colors.has(candidate.color))) &&
    (candidate.points === undefined || (Array.isArray(candidate.points) && candidate.points.every((point) => typeof point === "number" && Number.isFinite(point))))
  );
}

function isBoardConnection(value: unknown): value is BoardConnection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BoardConnection>;
  return typeof candidate.id === "string" && typeof candidate.fromId === "string" && typeof candidate.toId === "string";
}

/** Validates Firestore data before it reaches the board editor. */
export function parseBoardDocument(value: unknown): BoardDocument | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<BoardDocument>;
  if (
    candidate.version !== 1 ||
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    !Array.isArray(candidate.elements) ||
    !Array.isArray(candidate.connections) ||
    !candidate.elements.every(isBoardElement) ||
    !candidate.connections.every(isBoardConnection)
  ) return null;

  return candidate as BoardDocument;
}

function userBoardsPath(uid: string) {
  return collection(getFirebaseServices().firestore, "users", uid, "boards");
}

function toStoredBoard(id: string, value: unknown): StoredBoard | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { name?: unknown; document?: unknown };
  const document = parseBoardDocument(candidate.document);
  if (!document || document.id !== id || typeof candidate.name !== "string") return null;
  return { id, name: candidate.name, document };
}

export function subscribeToBoards(
  uid: string,
  onBoards: (boards: StoredBoard[]) => void,
  onError: (error: FirestoreError) => void,
) {
  return onSnapshot(
    query(userBoardsPath(uid), orderBy("updatedAt", "desc")),
    (snapshot) => onBoards(snapshot.docs.flatMap((snapshotDocument) => {
      const board = toStoredBoard(snapshotDocument.id, snapshotDocument.data());
      return board ? [board] : [];
    })),
    onError,
  );
}

export async function saveBoard(uid: string, board: StoredBoard) {
  const firestore = getFirebaseServices().firestore;
  await setDoc(doc(firestore, "users", uid, "boards", board.id), {
    name: board.name,
    document: board.document,
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
