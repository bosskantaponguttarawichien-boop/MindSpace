import type { StoredBoard } from "@/infrastructure/persistence/firestore-board-repository";

/**
 * Reconciles a Firestore snapshot with the boards already on screen.
 *
 * A snapshot only ever describes the last state a write left behind, so adopting it for a board
 * whose write is still pending throws away every edit made since that write was queued — the
 * editor would visibly jump back mid-gesture. Such boards keep their local version until the
 * queue drains. Ordering follows the local list so saving never reshuffles the sidebar.
 */
export function mergeRemoteBoards(
  local: StoredBoard[],
  remote: StoredBoard[],
  pendingIds: ReadonlySet<string>,
  deletedIds: ReadonlySet<string> = new Set(),
): StoredBoard[] {
  const incoming = remote.filter((board) => !deletedIds.has(board.id));
  const remoteById = new Map(incoming.map((board) => [board.id, board]));
  const merged = local.flatMap((board) => {
    const fromRemote = remoteById.get(board.id);
    if (!fromRemote) return pendingIds.has(board.id) ? [board] : [];
    return [pendingIds.has(board.id) ? board : fromRemote];
  });
  const kept = new Set(merged.map((board) => board.id));
  return [...merged, ...incoming.filter((board) => !kept.has(board.id))];
}
