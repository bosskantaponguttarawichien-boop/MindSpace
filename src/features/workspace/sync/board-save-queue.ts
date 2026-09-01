import type { StoredBoard } from "@/infrastructure/persistence/firestore-board-repository";

export type BoardSaveState = {
  /** Boards holding edits that have not been acknowledged by the repository yet. */
  pendingIds: ReadonlySet<string>;
  error: unknown;
};

export type BoardSaveQueueOptions = {
  save: (board: StoredBoard) => Promise<void>;
  onChange: (state: BoardSaveState) => void;
  /** Idle time before a burst of edits is written. */
  debounceMs?: number;
  /** Longest a burst may hold a write back, so a long drag still reaches the repository. */
  maxWaitMs?: number;
  /** Delay before a failed write is retried; the edits stay queued until one succeeds. */
  retryMs?: number;
};

export type BoardSaveQueue = {
  schedule: (board: StoredBoard) => void;
  /** Drops queued edits for a board and resolves once any in-flight write has settled. */
  cancel: (boardId: string) => Promise<void>;
  flush: () => Promise<void>;
  pendingIds: () => ReadonlySet<string>;
};

type Entry = {
  board: StoredBoard;
  timer: ReturnType<typeof setTimeout> | null;
  deadline: number;
  saving: Promise<void> | null;
};

/**
 * Writes board edits in the background: edits are coalesced, one board never has two writes in
 * flight, and a board stays queued while the user keeps editing so no keystroke has to wait for
 * the network. The queue owns the answer to "what is still unsaved?", which the snapshot
 * reconciliation needs to know which boards it must not overwrite.
 */
export function createBoardSaveQueue({
  save,
  onChange,
  debounceMs = 600,
  maxWaitMs = 2500,
  retryMs = 4000,
}: BoardSaveQueueOptions): BoardSaveQueue {
  const entries = new Map<string, Entry>();
  let error: unknown = null;

  function notify() {
    onChange({ pendingIds: new Set(entries.keys()), error });
  }

  function arm(boardId: string, entry: Entry, delay: number) {
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      entry.timer = null;
      void write(boardId);
    }, delay);
  }

  async function write(boardId: string): Promise<void> {
    const entry = entries.get(boardId);
    if (!entry || entry.saving) return;
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    const board = entry.board;
    entry.saving = (async () => {
      try {
        await save(board);
        error = null;
        const current = entries.get(boardId);
        if (!current) return;
        current.saving = null;
        if (current.board === board) {
          entries.delete(boardId);
          return;
        }
        current.deadline = Date.now() + maxWaitMs;
        arm(boardId, current, debounceMs);
      } catch (caught: unknown) {
        error = caught;
        const current = entries.get(boardId);
        if (!current) return;
        current.saving = null;
        current.deadline = Date.now() + retryMs;
        arm(boardId, current, retryMs);
      }
    })();
    try {
      await entry.saving;
    } finally {
      notify();
    }
  }

  return {
    schedule(board) {
      const entry = entries.get(board.id) ?? { board, timer: null, deadline: Date.now() + maxWaitMs, saving: null };
      entry.board = board;
      entries.set(board.id, entry);
      if (!entry.saving) arm(board.id, entry, Math.max(0, Math.min(debounceMs, entry.deadline - Date.now())));
      notify();
    },
    async cancel(boardId) {
      const entry = entries.get(boardId);
      if (!entry) return;
      if (entry.timer) clearTimeout(entry.timer);
      entries.delete(boardId);
      notify();
      await entry.saving;
    },
    async flush() {
      await Promise.all([...entries.keys()].map(async (boardId) => {
        await entries.get(boardId)?.saving;
        await write(boardId);
      }));
    },
    pendingIds: () => new Set(entries.keys()),
  };
}
