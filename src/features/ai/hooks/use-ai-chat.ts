"use client";

import { useState, useCallback } from "react";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BoardDocument, BoardElementId } from "@/domain/board/board-document";
import { extractBoardContext, formatContextForPrompt, type BoardAiContextScope } from "@/domain/ai/board-context";
import type { AiActionType, AiProposal } from "@/domain/ai/proposal-schema";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposal?: AiProposal;
  proposalStatus?: "pending" | "applied" | "rejected";
  isMock?: boolean;
};

export type UseAiChatOptions = {
  document?: BoardDocument;
  selectedIds?: BoardElementId[];
  onApplyProposal?: (proposal: AiProposal) => void;
  onStatusChange?: (status: { loading: boolean; text?: string; hasUnread?: boolean }) => void;
};

export type UseAiChatResult = {
  messages: ChatMessage[];
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  userScope: BoardAiContextScope | null;
  setUserScope: React.Dispatch<React.SetStateAction<BoardAiContextScope | null>>;
  lastWasMock: boolean;
  scope: BoardAiContextScope;
  selectedCount: number;
  totalCount: number;
  handleSend: (customPrompt?: string, action?: AiActionType) => Promise<void>;
  handleApprove: (messageId: string, proposal: AiProposal) => void;
  handleReject: (messageId: string) => void;
  clearMessages: () => void;
};

export function useAiChat({
  document,
  selectedIds = [],
  onApplyProposal,
  onStatusChange,
}: UseAiChatOptions = {}): UseAiChatResult {
  const { t, locale } = useLocale();
  const [userScope, setUserScope] = useState<BoardAiContextScope | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastWasMock, setLastWasMock] = useState(false);

  const selectedCount = selectedIds.length;
  const totalCount = document?.elements.length ?? 0;
  const scope: BoardAiContextScope = userScope ?? (selectedCount > 0 ? "selection" : "entire-board");

  const handleSend = useCallback(async (customPrompt?: string, action?: AiActionType) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend && !action) return;

    if (!customPrompt) setInput("");

    const userMessageId = `msg:${crypto.randomUUID()}`;
    const displayUserText = action ? `✦ ${t(action)}` : textToSend;

    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMessageId, role: "user", content: displayUserText },
    ];
    setMessages(newMessages);
    setLoading(true);
    const statusText = action ? t(action) : t("aiThinking");
    onStatusChange?.({ loading: true, text: statusText });

    try {
      const activeDoc: BoardDocument = document ?? { version: 1, id: "board:temp", name: "Board", elements: [], connections: [] };
      const boardContext = extractBoardContext(activeDoc, scope, selectedIds);
      const contextText = formatContextForPrompt(boardContext);

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextText,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          action,
          locale,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      setLastWasMock(Boolean(data?.isMock));

      setMessages((current) => [
        ...current,
        {
          id: `msg:${crypto.randomUUID()}`,
          role: "assistant",
          content: data?.text || t("aiDescription"),
          proposal: data?.proposal,
          proposalStatus: data?.proposal ? "pending" : undefined,
          isMock: data?.isMock,
        },
      ]);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : "Sorry, I couldn't reach the AI service right now. Please check your connection.";
      setMessages((current) => [
        ...current,
        {
          id: `msg:${crypto.randomUUID()}`,
          role: "assistant",
          content: errorText,
        },
      ]);
    } finally {
      setLoading(false);
      onStatusChange?.({ loading: false, text: "done", hasUnread: true });
    }
  }, [document, input, locale, messages, onStatusChange, scope, selectedIds, t]);

  const handleApprove = useCallback((messageId: string, proposal: AiProposal) => {
    onApplyProposal?.(proposal);
    setMessages((current) =>
      current.map((msg) =>
        msg.id === messageId ? { ...msg, proposalStatus: "applied" } : msg,
      ),
    );
  }, [onApplyProposal]);

  const handleReject = useCallback((messageId: string) => {
    setMessages((current) =>
      current.map((msg) =>
        msg.id === messageId ? { ...msg, proposalStatus: "rejected" } : msg,
      ),
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    input,
    setInput,
    loading,
    userScope,
    setUserScope,
    lastWasMock,
    scope,
    selectedCount,
    totalCount,
    handleSend,
    handleApprove,
    handleReject,
    clearMessages,
  };
}
