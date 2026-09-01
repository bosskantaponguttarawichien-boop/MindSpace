"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEmptyBoard } from "@/domain/board/sample-board";
import type { BoardDocument } from "@/domain/board/board-document";
import { getAnonymousUser } from "@/infrastructure/auth/firebase-anonymous-auth";
import { saveBoard, subscribeToBoards, type StoredBoard } from "@/infrastructure/persistence/firestore-board-repository";

export type BoardSyncStatus = "connecting" | "saved" | "saving" | "error";

function newBoard(name: string): StoredBoard {
  const id = `board:${crypto.randomUUID()}`;
  return { id, name, document: createEmptyBoard(id, name) };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to save this board.";
}

export function usePersistedBoards() {
  const [boards, setBoards] = useState<StoredBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState("");
  const [syncStatus, setSyncStatus] = useState<BoardSyncStatus>("connecting");
  const [syncError, setSyncError] = useState<string | null>(null);
  const uidRef = useRef<string | null>(null);
  const initialSnapshotRef = useRef(false);
  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const persist = useCallback(async (board: StoredBoard) => {
    const uid = uidRef.current;
    if (!uid) return;
    setSyncStatus("saving");
    try {
      await saveBoard(uid, board);
      setSyncError(null);
      setSyncStatus("saved");
    } catch (error: unknown) {
      setSyncError(errorMessage(error));
      setSyncStatus("error");
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    const saveTimers = saveTimersRef.current;

    async function connect() {
      try {
        const user = await getAnonymousUser();
        if (cancelled) return;
        uidRef.current = user.uid;
        unsubscribe = subscribeToBoards(user.uid, (remoteBoards) => {
          if (cancelled) return;
          if (!initialSnapshotRef.current) {
            initialSnapshotRef.current = true;
            if (remoteBoards.length === 0) {
              const board = newBoard("Untitled board");
              setBoards([board]);
              setActiveBoardId(board.id);
              void persist(board);
              return;
            }
          }
          setBoards(remoteBoards);
          setActiveBoardId((current) => remoteBoards.some((board) => board.id === current) ? current : (remoteBoards[0]?.id ?? ""));
          setSyncStatus("saved");
          setSyncError(null);
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
      unsubscribe?.();
      saveTimers.forEach((timer) => clearTimeout(timer));
      saveTimers.clear();
    };
  }, [persist]);

  const createBoard = useCallback(() => {
    const board = newBoard(`Untitled board ${boards.length + 1}`);
    setBoards((current) => [...current, board]);
    setActiveBoardId(board.id);
    void persist(board);
  }, [boards.length, persist]);

  const updateBoardDocument = useCallback((id: string, document: BoardDocument) => {
    setBoards((current) => {
      const board = current.find((candidate) => candidate.id === id);
      if (!board) return current;
      const next = { ...board, document };
      const previousTimer = saveTimersRef.current.get(id);
      if (previousTimer) clearTimeout(previousTimer);
      saveTimersRef.current.set(id, setTimeout(() => {
        saveTimersRef.current.delete(id);
        void persist(next);
      }, 600));
      setSyncStatus("saving");
      return current.map((candidate) => candidate.id === id ? next : candidate);
    });
  }, [persist]);

  return { boards, activeBoardId, setActiveBoardId, createBoard, updateBoardDocument, syncStatus, syncError };
}
