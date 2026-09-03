import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyBoard } from "@/domain/board/sample-board";
import type { BoardDocument } from "@/domain/board/board-document";
import type { Account } from "@/domain/auth/account";
import type { StoredBoard } from "@/infrastructure/persistence/firestore-board-repository";

type Snapshot = (boards: StoredBoard[]) => void;

const mocks = vi.hoisted(() => ({
  saveBoard: vi.fn<(scope: unknown, board: StoredBoard) => Promise<void>>(async () => {}),
  deleteBoard: vi.fn<(scope: unknown, boardId: string) => Promise<void>>(async () => {}),
  subscribeToBoards: vi.fn<(scope: unknown, onBoards: unknown, onError: unknown) => () => void>(() => () => {}),
}));

vi.mock("@/infrastructure/auth/firebase-anonymous-auth", () => ({
  getAnonymousUser: async () => ({ uid: "user-1" }),
}));

vi.mock("@/infrastructure/persistence/firestore-board-repository", () => ({
  saveBoard: mocks.saveBoard,
  deleteBoard: mocks.deleteBoard,
  subscribeToBoards: mocks.subscribeToBoards,
}));

vi.mock("@/infrastructure/files/firebase-board-images", () => ({
  uploadBoardImage: vi.fn(),
  deleteBoardImages: vi.fn(async () => {}),
}));

const { usePersistedBoards } = await import("@/features/workspace/hooks/use-persisted-boards");

const boardId = "board:one";

function document(text: string): BoardDocument {
  const empty = createEmptyBoard(boardId, "One");
  return { ...empty, elements: [{ id: "element:one", kind: "note", x: 0, y: 0, width: 10, height: 10, text }] };
}

function stored(text: string): StoredBoard {
  return { id: boardId, name: "One", document: document(text) };
}

function emitSnapshot(boards: StoredBoard[]) {
  const listener = mocks.subscribeToBoards.mock.calls.at(-1)?.[1] as Snapshot | undefined;
  if (!listener) throw new Error("The hook has not subscribed yet.");
  listener(boards);
}

describe("usePersistedBoards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => vi.useRealTimers());

  it("keeps edits made while a save is still in flight", async () => {
    const { result } = renderHook(() => usePersistedBoards());
    await waitFor(() => expect(mocks.subscribeToBoards).toHaveBeenCalled());
    await act(async () => emitSnapshot([stored("remote")]));

    const edited = document("still typing");
    act(() => result.current.updateBoardDocument(boardId, edited));
    // The snapshot echo of an earlier state must not pull the board back under the user.
    await act(async () => emitSnapshot([stored("remote")]));

    expect(result.current.boards[0]?.document).toBe(edited);
  });

  it("does not announce saving for a write that finishes quickly", async () => {
    const { result } = renderHook(() => usePersistedBoards());
    await waitFor(() => expect(mocks.subscribeToBoards).toHaveBeenCalled());
    await act(async () => emitSnapshot([stored("remote")]));

    act(() => result.current.updateBoardDocument(boardId, document("edited")));
    expect(result.current.syncStatus).toBe("saved");

    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(mocks.saveBoard).toHaveBeenCalledTimes(1);
    expect(result.current.syncStatus).toBe("saved");
  });

  it("coalesces a burst of edits into a single write", async () => {
    const { result } = renderHook(() => usePersistedBoards());
    await waitFor(() => expect(mocks.subscribeToBoards).toHaveBeenCalled());
    await act(async () => emitSnapshot([stored("remote")]));

    act(() => result.current.updateBoardDocument(boardId, document("one")));
    act(() => result.current.updateBoardDocument(boardId, document("two")));
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });

    expect(mocks.saveBoard).toHaveBeenCalledTimes(1);
    expect(mocks.saveBoard.mock.calls[0]?.[1].document.elements[0]?.text).toBe("two");
  });

  it("keeps the board subscription when an anonymous identity is linked to the same UID", async () => {
    const anonymousAccount: Account = { uid: "user-1", email: null, isAnonymous: true };
    const { rerender } = renderHook(
      ({ identity }: { identity: Account }) => usePersistedBoards(identity),
      { initialProps: { identity: anonymousAccount } },
    );
    await waitFor(() => expect(mocks.subscribeToBoards).toHaveBeenCalledTimes(1));

    rerender({ identity: { uid: "user-1", email: "ada@example.com", isAnonymous: false } });
    expect(mocks.subscribeToBoards).toHaveBeenCalledTimes(1);
  });
});
