"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEmptyBoard } from "@/domain/board/sample-board";
import type { BoardDocument } from "@/domain/board/board-document";
import { getAnonymousUser } from "@/infrastructure/auth/firebase-anonymous-auth";
import { saveBoard, subscribeToBoards, type BoardScope, type StoredBoard } from "@/infrastructure/persistence/firestore-board-repository";
import { uploadBoardImage, type UploadedImage } from "@/infrastructure/files/firebase-board-images";

export type BoardSyncStatus = "connecting" | "saved" | "saving" | "error";

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

export function usePersistedBoards() {
  const [boards, setBoards] = useState<StoredBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState("");
  const [syncStatus, setSyncStatus] = useState<BoardSyncStatus>("connecting");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(readWorkspaceId);
  const scopeRef = useRef<BoardScope | null>(null);
  const initialSnapshotRef = useRef(false);
  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const persist = useCallback(async (board: StoredBoard) => {
    const scope = scopeRef.current;
    if (!scope) return;
    setSyncStatus("saving");
    try {
      await saveBoard(scope, board);
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
        const scope: BoardScope = workspaceId ? { kind: "shared", workspaceId } : { kind: "personal", uid: user.uid };
        scopeRef.current = scope;
        initialSnapshotRef.current = false;
        unsubscribe = subscribeToBoards(scope, (remoteBoards) => {
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
      scopeRef.current = null;
      unsubscribe?.();
      saveTimers.forEach((timer) => clearTimeout(timer));
      saveTimers.clear();
    };
  }, [persist, workspaceId]);

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

  const copySyncLink = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    let nextWorkspaceId = workspaceId;
    if (!nextWorkspaceId) {
      nextWorkspaceId = crypto.randomUUID();
      const sharedScope: BoardScope = { kind: "shared", workspaceId: nextWorkspaceId };
      setSyncStatus("saving");
      try {
        await Promise.all(boards.map((board) => saveBoard(sharedScope, board)));
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
  }, [boards, workspaceId]);

  const uploadImage = useCallback(async (file: File): Promise<UploadedImage> => {
    const scope = scopeRef.current;
    if (!scope) throw new Error("Your board is still connecting.");
    return uploadBoardImage(scope, file);
  }, []);

  return { boards, activeBoardId, setActiveBoardId, createBoard, updateBoardDocument, copySyncLink, uploadImage, syncStatus, syncError };
}
