"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEmptyBoard } from "@/domain/board/sample-board";
import type { BoardDocument } from "@/domain/board/board-document";
import type { Account } from "@/domain/auth/account";
import { getAnonymousUser } from "@/infrastructure/auth/firebase-anonymous-auth";
import { deleteBoard as deleteRemoteBoard, saveBoard, subscribeToBoards, type BoardScope, type StoredBoard } from "@/infrastructure/persistence/firestore-board-repository";
import { deleteBoardImages, uploadBoardImage, type UploadedImage } from "@/infrastructure/files/firebase-board-images";
import { createBoardSaveQueue, type BoardSaveQueue, type BoardSaveState } from "@/features/workspace/sync/board-save-queue";
import { mergeRemoteBoards } from "@/features/workspace/sync/merge-remote-boards";

export type BoardSyncStatus = "connecting" | "saved" | "saving" | "error";

/** A quick write stays invisible: the badge only announces saving when one outlives this. */
const SAVING_NOTICE_MS = 1200;

function newBoard(name: string): StoredBoard {
  const id = `board:${crypto.randomUUID()}`;
  return { id, name, document: createEmptyBoard(id, name) };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to save this board.";
}

function readWorkspaceId() {
  if (typeof window === "undefined") return null;
  const workspaceId = new URLSearchParams(window.location.search).get("workspace");
  return workspaceId && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId) ? workspaceId : null;
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    window.prompt("Copy this private sync link", value);
  }
}

export function usePersistedBoards(identity?: Account | null) {
  const [boards, setBoards] = useState<StoredBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState("");
  const [syncStatus, setSyncStatus] = useState<BoardSyncStatus>("connecting");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(readWorkspaceId);
  const scopeRef = useRef<BoardScope | null>(null);
  const queueRef = useRef<BoardSaveQueue | null>(null);
  const boardsRef = useRef<StoredBoard[]>([]);
  const deletedIdsRef = useRef(new Set<string>());
  const savingNoticeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const identityUid = identity?.uid;
  const hasSuppliedIdentity = identity !== undefined;
  const isWaitingForIdentity = identity === null;

  const nextBoardName = `Untitled board ${boards.length + 1}`;

  const commitBoards = useCallback((next: StoredBoard[]) => {
    boardsRef.current = next;
    setBoards(next);
  }, []);

  const applySaveState = useCallback((state: BoardSaveState) => {
    if (savingNoticeRef.current) {
      clearTimeout(savingNoticeRef.current);
      savingNoticeRef.current = null;
    }
    if (state.error !== null) {
      setSyncError(errorMessage(state.error));
      setSyncStatus("error");
      return;
    }
    setSyncError(null);
    if (state.pendingIds.size === 0) {
      setSyncStatus("saved");
      return;
    }
    setSyncStatus((current) => current === "error" ? "saving" : current);
    savingNoticeRef.current = setTimeout(() => {
      savingNoticeRef.current = null;
      setSyncStatus("saving");
    }, SAVING_NOTICE_MS);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    let queue: BoardSaveQueue | null = null;
    const savingNotice = savingNoticeRef;

    async function connect() {
      try {
        if (isWaitingForIdentity) return;
        const user = hasSuppliedIdentity ? { uid: identityUid! } : await getAnonymousUser();
        if (cancelled) return;
        if (hasSuppliedIdentity) {
          // Do not briefly render the previous account's board while switching identities.
          commitBoards([]);
          setActiveBoardId("");
        }
        const scope: BoardScope = workspaceId ? { kind: "shared", workspaceId } : { kind: "personal", uid: user.uid };
        scopeRef.current = scope;
        queue = createBoardSaveQueue({ save: (board) => saveBoard(scope, board), onChange: applySaveState });
        queueRef.current = queue;
        let firstSnapshot = true;
        unsubscribe = subscribeToBoards(scope, (remoteBoards) => {
          if (cancelled || !queue) return;
          if (firstSnapshot) {
            firstSnapshot = false;
            if (remoteBoards.length === 0) {
              const board = newBoard("Untitled board");
              commitBoards([board]);
              setActiveBoardId(board.id);
              queue.schedule(board);
              return;
            }
          }
          const remoteIds = new Set(remoteBoards.map((board) => board.id));
          for (const deletedId of deletedIdsRef.current) {
            if (!remoteIds.has(deletedId)) deletedIdsRef.current.delete(deletedId);
          }
          const merged = mergeRemoteBoards(boardsRef.current, remoteBoards, queue.pendingIds(), deletedIdsRef.current);
          commitBoards(merged);
          setActiveBoardId((current) => merged.some((board) => board.id === current) ? current : (merged[0]?.id ?? ""));
          setSyncStatus((current) => current === "connecting" ? "saved" : current);
        }, (error) => {
          if (cancelled) return;
          setSyncStatus("error");
          setSyncError(error.message);
        });
      } catch (error: unknown) {
        if (cancelled) return;
        setSyncStatus("error");
        setSyncError(errorMessage(error));
      }
    }

    void connect();
    return () => {
      cancelled = true;
      scopeRef.current = null;
      queueRef.current = null;
      unsubscribe?.();
      if (savingNotice.current) {
        clearTimeout(savingNotice.current);
        savingNotice.current = null;
      }
      // Queued edits outlive the subscription: tearing the hook down must still write them.
      void queue?.flush();
    };
  }, [applySaveState, commitBoards, hasSuppliedIdentity, identityUid, isWaitingForIdentity, workspaceId]);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (window.document.visibilityState === "hidden") void queueRef.current?.flush();
    };
    const flushNow = () => { void queueRef.current?.flush(); };
    window.document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flushNow);
    return () => {
      window.document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flushNow);
    };
  }, []);

  const createBoard = useCallback((name?: string) => {
    const board = newBoard(name?.trim() || `Untitled board ${boardsRef.current.length + 1}`);
    commitBoards([...boardsRef.current, board]);
    setActiveBoardId(board.id);
    queueRef.current?.schedule(board);
  }, [commitBoards]);

  const renameBoard = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    const board = boardsRef.current.find((candidate) => candidate.id === id);
    if (!trimmed || !board || board.name === trimmed) return;
    const next: StoredBoard = { ...board, name: trimmed, document: { ...board.document, name: trimmed } };
    commitBoards(boardsRef.current.map((candidate) => candidate.id === id ? next : candidate));
    queueRef.current?.schedule(next);
  }, [commitBoards]);

  const deleteBoard = useCallback(async (id: string) => {
    const scope = scopeRef.current;
    if (!scope) return;
    // A write already on the wire has to settle first, or it would recreate the deleted board.
    await queueRef.current?.cancel(id);
    deletedIdsRef.current.add(id);
    const remaining = boardsRef.current.filter((board) => board.id !== id);
    commitBoards(remaining);
    setActiveBoardId((current) => current === id ? (remaining[0]?.id ?? "") : current);
    try {
      await deleteRemoteBoard(scope, id);
      setSyncError(null);
      setSyncStatus("saved");
    } catch (error: unknown) {
      deletedIdsRef.current.delete(id);
      setSyncError(errorMessage(error));
      setSyncStatus("error");
      return;
    }
    if (remaining.length === 0) {
      const board = newBoard("Untitled board 1");
      commitBoards([board]);
      setActiveBoardId(board.id);
      queueRef.current?.schedule(board);
    }
  }, [commitBoards]);

  const updateBoardDocument = useCallback((id: string, document: BoardDocument) => {
    const board = boardsRef.current.find((candidate) => candidate.id === id);
    if (!board) return;
    const next: StoredBoard = { ...board, document };
    commitBoards(boardsRef.current.map((candidate) => candidate.id === id ? next : candidate));
    queueRef.current?.schedule(next);
  }, [commitBoards]);

  const copySyncLink = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    let nextWorkspaceId = workspaceId;
    if (!nextWorkspaceId) {
      nextWorkspaceId = crypto.randomUUID();
      const sharedScope: BoardScope = { kind: "shared", workspaceId: nextWorkspaceId };
      setSyncStatus("saving");
      try {
        await Promise.all(boardsRef.current.map((board) => saveBoard(sharedScope, board)));
        setWorkspaceId(nextWorkspaceId);
        window.history.replaceState(null, "", `?workspace=${nextWorkspaceId}`);
      } catch (error: unknown) {
        setSyncError(errorMessage(error));
        setSyncStatus("error");
        return false;
      }
    }
    const url = new URL(window.location.href);
    url.searchParams.set("workspace", nextWorkspaceId);
    await copyToClipboard(url.toString());
    return true;
  }, [workspaceId]);

  const uploadImage = useCallback(async (file: File): Promise<UploadedImage> => {
    const scope = scopeRef.current;
    if (!scope) throw new Error("Your board is still connecting.");
    return uploadBoardImage(scope, file);
  }, []);

  const deleteImages = useCallback(async (urls: string[]) => {
    await deleteBoardImages(urls);
  }, []);

  return { boards, activeBoardId, setActiveBoardId, nextBoardName, createBoard, renameBoard, deleteBoard, updateBoardDocument, copySyncLink, uploadImage, deleteImages, syncStatus, syncError };
}
