import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyBoard } from "@/domain/board/sample-board";
import { createBoardSaveQueue, type BoardSaveState } from "@/features/workspace/sync/board-save-queue";
import type { StoredBoard } from "@/infrastructure/persistence/firestore-board-repository";

const boardId = "board:one";

function board(text: string): StoredBoard {
  const document = createEmptyBoard(boardId, "One");
  return {
    id: boardId,
    name: "One",
    document: { ...document, elements: [{ id: "element:one", kind: "note", x: 0, y: 0, width: 10, height: 10, text }] },
  };
}

describe("createBoardSaveQueue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("writes a burst of edits once, with the latest document", async () => {
    const save = vi.fn<(board: StoredBoard) => Promise<void>>(async () => {});
    const queue = createBoardSaveQueue({ save, onChange: () => {} });

    queue.schedule(board("first"));
    await vi.advanceTimersByTimeAsync(300);
    queue.schedule(board("second"));
    await vi.advanceTimersByTimeAsync(599);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[0].document.elements[0]?.text).toBe("second");
    expect(queue.pendingIds().size).toBe(0);
  });

  it("still writes during an edit stream that never goes idle", async () => {
    const save = vi.fn<(board: StoredBoard) => Promise<void>>(async () => {});
    const queue = createBoardSaveQueue({ save, onChange: () => {} });

    for (let step = 0; step < 12; step += 1) {
      queue.schedule(board(`step ${step}`));
      await vi.advanceTimersByTimeAsync(300);
    }
    expect(save).toHaveBeenCalled();
  });

  it("never overlaps writes and sends the edits made while one was in flight", async () => {
    const releases: Array<() => void> = [];
    const save = vi.fn<(board: StoredBoard) => Promise<void>>(() => new Promise((resolve) => releases.push(resolve)));
    const queue = createBoardSaveQueue({ save, onChange: () => {} });

    queue.schedule(board("first"));
    await vi.advanceTimersByTimeAsync(600);
    expect(save).toHaveBeenCalledTimes(1);

    queue.schedule(board("second"));
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.pendingIds().has(boardId)).toBe(true);

    releases[0]?.();
    await vi.advanceTimersByTimeAsync(600);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]?.[0].document.elements[0]?.text).toBe("second");

    releases[1]?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(queue.pendingIds().size).toBe(0);
  });

  it("keeps the edits and retries after a failed write", async () => {
    const save = vi.fn<(board: StoredBoard) => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const states: BoardSaveState[] = [];
    const queue = createBoardSaveQueue({ save, onChange: (state) => states.push(state), retryMs: 4000 });

    queue.schedule(board("first"));
    await vi.advanceTimersByTimeAsync(600);
    expect(states.at(-1)?.error).toBeInstanceOf(Error);
    expect(queue.pendingIds().has(boardId)).toBe(true);

    await vi.advanceTimersByTimeAsync(4000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(states.at(-1)?.error).toBeNull();
    expect(queue.pendingIds().size).toBe(0);
  });

  it("flushes queued edits without waiting for the debounce", async () => {
    const save = vi.fn<(board: StoredBoard) => Promise<void>>(async () => {});
    const queue = createBoardSaveQueue({ save, onChange: () => {} });

    queue.schedule(board("first"));
    await queue.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.pendingIds().size).toBe(0);
  });

  it("drops queued edits for a cancelled board", async () => {
    const save = vi.fn<(board: StoredBoard) => Promise<void>>(async () => {});
    const queue = createBoardSaveQueue({ save, onChange: () => {} });

    queue.schedule(board("first"));
    await queue.cancel(boardId);
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).not.toHaveBeenCalled();
    expect(queue.pendingIds().size).toBe(0);
  });
});
