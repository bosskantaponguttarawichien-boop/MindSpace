"use client";

import { useCallback, useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";
import { AiPanel } from "@/features/ai/components/ai-panel";
import { useAiChat } from "@/features/ai/hooks/use-ai-chat";
import { BoardCanvas } from "@/features/board/components/board-canvas";
import { ExportPdfDialog } from "@/features/board/components/export-pdf-dialog";
import { LocalPdfViewer, type LocalPdf } from "@/features/board/components/local-pdf-viewer";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceTopbar } from "@/features/workspace/components/workspace-topbar";
import { AccountDialog } from "@/features/workspace/components/account-dialog";
import type { BoardDocument, BoardElementId } from "@/domain/board/board-document";
import type { BoardEngine, BoardExport } from "@/infrastructure/board-engine/board-engine";
import { usePersistedBoards } from "@/features/workspace/hooks/use-persisted-boards";
import { useLocale } from "@/lib/i18n/locale-provider";
import { useAccount } from "@/features/workspace/hooks/use-account";
import { useVisualViewport } from "@/shared/hooks/use-visual-viewport";

export function MindSpaceApp() {
  const { t, locale } = useLocale();
  const { account, status: accountStatus, linkAccount, signIn, recover, signOut } = useAccount();
  const [engine, setEngine] = useState<BoardEngine | null>(null);
  const { boards, activeBoardId, setActiveBoardId, nextBoardName, createBoard, renameBoard, deleteBoard, updateBoardDocument, uploadImage, deleteImages, syncStatus, syncError } = usePersistedBoards(account);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileAiOpen, setMobileAiOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ loading: boolean; text?: string; hasUnread?: boolean }>({
    loading: false,
    hasUnread: false,
  });
  const [pdf, setPdf] = useState<LocalPdf | null>(null);
  const [exportPreview, setExportPreview] = useState<BoardExport | null>(null);
  const [selectedIds, setSelectedIds] = useState<BoardElementId[]>([]);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const mobileViewport = useVisualViewport();
  const activeBoard = boards.find((board) => board.id === activeBoardId);

  const aiChatState = useAiChat({
    document: activeBoard?.document,
    selectedIds,
    onApplyProposal: (proposal) => engine?.applyProposal(proposal),
    onStatusChange: setAiStatus,
  });

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleToggleRightPanel = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileAiOpen((prev) => !prev);
      setAiStatus((prev) => ({ ...prev, hasUnread: false }));
    } else {
      setRightPanelOpen((prev) => !prev);
    }
  }, []);

  const handleCloseRightPanel = useCallback(() => {
    setRightPanelOpen(false);
  }, []);

  const handleCloseMobileAi = useCallback(() => {
    setMobileAiOpen(false);
  }, []);

  const handleOpenMobileAi = useCallback(() => {
    setMobileAiOpen(true);
    setAiStatus((prev) => ({ ...prev, hasUnread: false }));
  }, []);

  const handleEngineReady = useCallback((readyEngine: BoardEngine) => setEngine(readyEngine), []);
  const handleDocumentChange = useCallback((document: BoardDocument) => {
    if (activeBoardId) updateBoardDocument(activeBoardId, document);
  }, [activeBoardId, updateBoardDocument]);
  const selectBoard = (id: string) => { setActiveBoardId(id); setEngine(null); setSelectedIds([]); };
  const requestExport = () => {
    const preview = engine?.renderExport() ?? null;
    if (!preview) return window.alert(t("exportFailed"));
    setExportPreview(preview);
  };
  return (
    <>
      <AppShell
        sidebarOpen={sidebarOpen}
        rightPanelOpen={rightPanelOpen}
        sidebar={
          <WorkspaceSidebar
            boards={boards}
            activeBoardId={activeBoardId}
            nextBoardName={nextBoardName}
            onCreateBoard={createBoard}
            onRenameBoard={renameBoard}
            onDeleteBoard={deleteBoard}
            onSelectBoard={selectBoard}
            onToggleSidebar={handleToggleSidebar}
          />
        }
        topbar={
          <WorkspaceTopbar
            engine={engine}
            boardName={activeBoard?.name ?? "MindSpace"}
            boards={boards}
            activeBoardId={activeBoardId}
            nextBoardName={nextBoardName}
            syncStatus={syncStatus}
            syncError={syncError}
            sidebarOpen={sidebarOpen}
            rightPanelOpen={rightPanelOpen}
            onCreateBoard={createBoard}
            onRenameBoard={renameBoard}
            onDeleteBoard={deleteBoard}
            onSelectBoard={selectBoard}
            onExportPdf={requestExport}
            onToggleSidebar={handleToggleSidebar}
            onToggleRightPanel={handleToggleRightPanel}
            accountLabel={accountStatus === "loading" ? t("accountLoading") : account?.isAnonymous ? t("signIn") : (account?.email ?? t("account"))}
            onOpenAccount={() => setAccountDialogOpen(true)}
            account={account}
            onSignOut={signOut}
          />
        }
        board={
          activeBoard ? (
            <BoardCanvas
              key={activeBoardId}
              document={activeBoard.document}
              onDocumentChange={handleDocumentChange}
              onUploadImage={uploadImage}
              onDeleteImages={deleteImages}
              onOpenPdf={setPdf}
              onEngineReady={handleEngineReady}
              onSelectionIdsChange={setSelectedIds}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">{t("syncConnecting")}…</div>
          )
        }
        rightPanel={
          <AiPanel
            document={activeBoard?.document}
            selectedIds={selectedIds}
            onApplyProposal={(proposal) => engine?.applyProposal(proposal)}
            onClose={handleCloseRightPanel}
            chatState={aiChatState}
          />
        }
      />
      {/* Mobile Floating AI Button & Live Progress Badge */}
      {!mobileAiOpen && aiStatus.loading ? (
        <button
          type="button"
          onClick={handleOpenMobileAi}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] end-16 z-30 flex cursor-pointer items-center gap-2 rounded-full border border-primary/30 bg-background/95 py-1.5 pe-3 ps-2.5 text-xs font-medium text-foreground shadow-lg backdrop-blur active:scale-95 transition-all animate-pulse lg:hidden"
          role="status"
          aria-label={aiStatus.text ?? t("aiThinking")}
        >
          <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
          <span className="truncate max-w-[130px]">{aiStatus.text ?? t("aiThinking")}</span>
        </button>
      ) : !mobileAiOpen && aiStatus.hasUnread ? (
        <button
          type="button"
          onClick={handleOpenMobileAi}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] end-16 z-30 flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-500/40 bg-background/95 py-1.5 pe-3 ps-2.5 text-xs font-medium text-foreground shadow-lg backdrop-blur active:scale-95 transition-all lg:hidden"
          role="status"
          aria-label={locale === "th" ? "เสร็จแล้ว กดเพื่อดู" : "Done! Tap to view"}
        >
          <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">{locale === "th" ? "เสร็จแล้ว กดเพื่อดู" : "Done! Tap to view"}</span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={handleOpenMobileAi}
        className={cn(
          "fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] end-3 z-30 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 sm:bottom-4 sm:end-4 lg:hidden",
          aiStatus.loading && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
        aria-label={t("boardAi")}
        title={t("boardAi")}
      >
        <Bot className="size-6" />
        {aiStatus.hasUnread ? (
          <span className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-500 ring-2 ring-background" />
        ) : null}
      </button>

      {/* Mobile AI Popup Container (Persistent to preserve background processing and conversation state) */}
      <div
        className={cn(
          "fixed start-0 top-0 z-50 flex w-full flex-col justify-end p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:p-4 lg:hidden transition-[visibility] duration-300",
          mobileAiOpen ? "visible pointer-events-auto" : "invisible pointer-events-none delay-300"
        )}
        style={mobileViewport ? {
          height: `${mobileViewport.height}px`,
          transform: `translateY(${mobileViewport.offsetTop}px)`,
        } : { height: "100dvh" }}
        aria-hidden={!mobileAiOpen}
      >
        {/* Backdrop: Smooth fade in/out */}
        <div
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ease-out",
            mobileAiOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={handleCloseMobileAi}
        />
        {/* Popup Card: Smooth slide-up with subtle scale & spring-like curve */}
        <div
          className={cn(
            "relative z-10 mx-auto flex h-full max-h-[850px] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            mobileAiOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-8 scale-[0.97] opacity-0"
          )}
        >
          <AiPanel
            document={activeBoard?.document}
            selectedIds={selectedIds}
            onApplyProposal={(proposal) => engine?.applyProposal(proposal)}
            onClose={handleCloseMobileAi}
            chatState={aiChatState}
          />
        </div>
      </div>
      <ExportPdfDialog preview={exportPreview} onClose={() => setExportPreview(null)} />
      {accountDialogOpen ? (
        <AccountDialog
          open
          onClose={() => setAccountDialogOpen(false)}
          account={account}
          boardCount={boards.length}
          onLinkAccount={linkAccount}
          onSignIn={signIn}
          onRecover={recover}
          onSignOut={signOut}
        />
      ) : null}
      {pdf ? <LocalPdfViewer pdf={pdf} onClose={() => { URL.revokeObjectURL(pdf.url); setPdf(null); }} /> : null}
    </>
  );
}
