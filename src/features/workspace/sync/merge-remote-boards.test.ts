import { describe, expect, it } from "vitest";
import { createEmptyBoard } from "@/domain/board/sample-board";
import { mergeRemoteBoards } from "@/features/workspace/sync/merge-remote-boards";
import type { StoredBoard } from "@/infrastructure/persistence/firestore-board-repository";

function board(id: string, text: string): StoredBoard {
  const document = createEmptyBoard(id, id);
  return {
    id,
    name: id,
    document: { ...document, elements: [{ id: `element:${id}`, kind: "note", x: 0, y: 0, width: 10, height: 10, text }] },
  };
}

const nothing = new Set<string>();

describe("mergeRemoteBoards", () => {
  it("keeps the local document of a board whose write is still pending", () => {
    const merged = mergeRemoteBoards([board("board:one", "typing")], [board("board:one", "stale echo")], new Set(["board:one"]));
    expect(merged[0]?.document.elements[0]?.text).toBe("typing");
  });

  it("adopts the remote document once the board has no pending write", () => {
    const merged = mergeRemoteBoards([board("board:one", "local")], [board("board:one", "from another device")], nothing);
    expect(merged[0]?.document.elements[0]?.text).toBe("from another device");
  });

  it("keeps the local order and appends boards that appeared remotely", () => {
    const merged = mergeRemoteBoards(
      [board("board:one", "a"), board("board:two", "b")],
      [board("board:two", "b"), board("board:one", "a"), board("board:three", "c")],
      nothing,
    );
    expect(merged.map((entry) => entry.id)).toEqual(["board:one", "board:two", "board:three"]);
  });

  it("keeps a locally created board that has not been written yet", () => {
    const merged = mergeRemoteBoards([board("board:one", "a"), board("board:new", "b")], [board("board:one", "a")], new Set(["board:new"]));
    expect(merged.map((entry) => entry.id)).toEqual(["board:one", "board:new"]);
  });

  it("drops a board that was removed remotely and has nothing pending", () => {
    const merged = mergeRemoteBoards([board("board:one", "a"), board("board:two", "b")], [board("board:one", "a")], nothing);
    expect(merged.map((entry) => entry.id)).toEqual(["board:one"]);
  });

  it("hides a board deleted here until the snapshot catches up", () => {
    const merged = mergeRemoteBoards([board("board:one", "a")], [board("board:one", "a"), board("board:two", "b")], nothing, new Set(["board:two"]));
    expect(merged.map((entry) => entry.id)).toEqual(["board:one"]);
  });
});
