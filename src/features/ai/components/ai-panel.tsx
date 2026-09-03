"use client";

import { useRef, useEffect } from "react";
import { Bot, Check, CheckCircle2, CircleHelp, GitFork, ListPlus, Loader2, PanelRightClose, ScanSearch, Send, Sparkles, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BoardDocument, BoardElementId } from "@/domain/board/board-document";
import type { AiActionType, AiProposal } from "@/domain/ai/proposal-schema";

import { useAiChat, type ChatMessage, type UseAiChatResult } from "@/features/ai/hooks/use-ai-chat";

export type { ChatMessage };

const actions: Array<{ label: AiActionType; icon: typeof Sparkles }> = [
  { label: "summarize", icon: Sparkles },
  { label: "expand", icon: ListPlus },
  { label: "check", icon: CheckCircle2 },
  { label: "mindMap", icon: GitFork },
  { label: "explain", icon: CircleHelp },
  { label: "improve", icon: ScanSearch },
];

export function AiPanel({
  document,
  selectedIds = [],
  onApplyProposal,
  onClose,
  onStatusChange,
  chatState: externalChatState,
}: {
  document?: BoardDocument;
  selectedIds?: BoardElementId[];
  onApplyProposal?: (proposal: AiProposal) => void;
  onClose?: () => void;
  onStatusChange?: (status: { loading: boolean; text?: string; hasUnread?: boolean }) => void;
  chatState?: UseAiChatResult;
}) {
  const { t } = useLocale();
  const internalChatState = useAiChat({ document, selectedIds, onApplyProposal, onStatusChange });
  const chat = externalChatState ?? internalChatState;
  const {
    messages,
    input,
    setInput,
    loading,
    setUserScope,
    lastWasMock,
    scope,
    selectedCount,
    totalCount,
    handleSend,
    handleApprove,
    handleReject,
    clearMessages,
  } = chat;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  return (
    <aside className="flex h-full flex-col bg-background" aria-label={t("boardAi")}>
      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bot className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold">{t("boardAi")}</h2>
              <Badge variant="secondary" className="mt-0.5 text-[10px] font-semibold text-primary">
                {t("aiActive")}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                title={t("aiClear")}
                onClick={clearMessages}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
            {onClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                aria-label={t("collapseAiPanel")}
                title={t("collapseAiPanel")}
                onClick={onClose}
              >
                <PanelRightClose className="size-4 max-lg:hidden" />
                <X className="size-4 lg:hidden" />
              </Button>
            ) : null}
          </div>
        </div>

        {/* Context Scope Selector */}
        <div className="mt-3.5 flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs">
          <button
            type="button"
            aria-pressed={scope === "entire-board"}
            className={`flex-1 rounded-md py-1 text-center font-medium transition-colors ${
              scope === "entire-board"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setUserScope("entire-board")}
          >
            {t("contextEntireBoard")} ({totalCount})
          </button>
          <button
            type="button"
            aria-pressed={scope === "selection"}
            className={`flex-1 rounded-md py-1 text-center font-medium transition-colors ${
              scope === "selection"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setUserScope("selection")}
          >
            {t("contextSelection")} ({selectedCount})
          </button>
        </div>
      </div>

      <Separator />

      {/* Quick Action Row (Single scrollable row) */}
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 sm:px-4 no-scrollbar">
        {actions.map(({ label, icon: Icon }) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs font-medium transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-95"
            disabled={loading}
            onClick={() => handleSend(undefined, label)}
          >
            <Icon className="size-3.5 shrink-0 text-primary" />
            <span className="whitespace-nowrap">{t(label)}</span>
          </Button>
        ))}
      </div>

      <Separator />

      {/* Messages Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 sm:p-4 text-xs">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <Sparkles className="size-8 text-primary/40" />
            <p className="mt-2 text-sm font-semibold text-foreground">{t("boardAi")}</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed">{t("aiDescription")}</p>
          </div>
        ) : null}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-muted/70 text-foreground border border-border/60"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>

            {/* Structured Proposal Card */}
            {msg.proposal ? (
              <div className="mt-2.5 w-full rounded-xl border-2 border-primary/20 bg-card p-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Sparkles className="size-3.5" />
                  <span>{msg.proposal.title}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{msg.proposal.explanation}</p>

                {/* Proposed Elements List */}
                {msg.proposal.elements && msg.proposal.elements.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {msg.proposal.elements.map((elem, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium"
                      >
                        <span className="size-2 rounded-full bg-primary" />
                        <span className="font-semibold text-muted-foreground">[{elem.kind}]</span>
                        <span className="truncate max-w-44">{elem.text}</span>
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Proposed Connector Updates */}
                {msg.proposal.updateConnections && msg.proposal.updateConnections.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {msg.proposal.updateConnections.map((update, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium"
                      >
                        <span className="font-semibold text-primary">Connector:</span>
                        {update.headType ? <span>head → {update.headType}</span> : null}
                        {update.style ? <span>style → {update.style}</span> : null}
                        {update.lineStyle ? <span>line → {update.lineStyle}</span> : null}
                        {update.color ? <span>color → {update.color}</span> : null}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Proposed Element Updates */}
                {msg.proposal.updateElements && msg.proposal.updateElements.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {msg.proposal.updateElements.map((update, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium"
                      >
                        <span className="font-semibold text-primary">Element:</span>
                        {update.color ? <span>color → {update.color}</span> : null}
                        {update.kind ? <span>kind → {update.kind}</span> : null}
                        {update.text ? <span className="truncate max-w-40">{update.text}</span> : null}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Proposal Decision Actions */}
                <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-border">
                  {msg.proposalStatus === "pending" ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleReject(msg.id)}
                      >
                        <X className="size-3" />
                        {t("aiReject")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs gap-1 font-semibold"
                        onClick={() => handleApprove(msg.id, msg.proposal!)}
                      >
                        <Check className="size-3" />
                        {t("aiApprove")}
                      </Button>
                    </>
                  ) : msg.proposalStatus === "applied" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" /> {t("aiProposalApplied")}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      {t("aiProposalRejected")}
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>{t("aiThinking")}</span>
          </div>
        ) : null}
      </div>

      {/* Mock notice hint if demo mode */}
      {lastWasMock ? (
        <div className="border-t border-border bg-muted/20 px-4 py-1.5 text-[10px] text-muted-foreground">
          {t("aiNoKeyHint")}
        </div>
      ) : null}

      {/* Input Area */}
      <div className="border-t border-border p-3 sm:p-4">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("askAiPlaceholder")}
            disabled={loading}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="size-8 shrink-0 rounded-xl"
            title={t("aiSend")}
          >
            <Send className="size-3.5" />
          </Button>
        </form>
      </div>
    </aside>
  );
}
