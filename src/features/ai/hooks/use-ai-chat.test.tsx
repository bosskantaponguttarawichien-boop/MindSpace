import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAiChat } from "@/features/ai/hooks/use-ai-chat";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import type { BoardDocument } from "@/domain/board/board-document";
import type { ReactNode } from "react";

const mockDoc: BoardDocument = {
  version: 1,
  id: "board:test",
  name: "Test Board",
  elements: [
    { id: "element:1", kind: "note", x: 0, y: 0, width: 100, height: 100, text: "Idea 1" },
  ],
  connections: [],
};

function wrapper({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("useAiChat", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with default state and calculates scope", () => {
    const { result } = renderHook(() => useAiChat({ document: mockDoc, selectedIds: ["element:1"] }), { wrapper });

    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.scope).toBe("selection");
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.totalCount).toBe(1);
  });

  it("sends a message, notifies onStatusChange, and appends response", async () => {
    const onStatusChange = vi.fn();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        text: "AI response text",
        isMock: true,
      }),
    });

    const { result } = renderHook(() => useAiChat({ document: mockDoc, onStatusChange }), { wrapper });

    await act(async () => {
      await result.current.handleSend("Hello AI");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]?.role).toBe("user");
    expect(result.current.messages[0]?.content).toBe("Hello AI");
    expect(result.current.messages[1]?.role).toBe("assistant");
    expect(result.current.messages[1]?.content).toBe("AI response text");
    expect(result.current.lastWasMock).toBe(true);
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ loading: false, hasUnread: true }));
  });

  it("handles approve and reject for proposals", async () => {
    const onApplyProposal = vi.fn();
    const proposal = {
      id: "proposal:1",
      title: "Add node",
      explanation: "Explain",
      elements: [{ kind: "note" as const, text: "New node" }],
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        text: "Here is a proposal",
        proposal,
      }),
    });

    const { result } = renderHook(() => useAiChat({ document: mockDoc, onApplyProposal }), { wrapper });

    await act(async () => {
      await result.current.handleSend("Propose changes");
    });

    const assistantMsg = result.current.messages[1]!;
    expect(assistantMsg.proposalStatus).toBe("pending");

    act(() => {
      result.current.handleApprove(assistantMsg.id, proposal);
    });
    expect(onApplyProposal).toHaveBeenCalledWith(proposal);
    expect(result.current.messages[1]?.proposalStatus).toBe("applied");

    act(() => {
      result.current.handleReject(assistantMsg.id);
    });
    expect(result.current.messages[1]?.proposalStatus).toBe("rejected");
  });

  it("clears messages with clearMessages", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "Response" }),
    });

    const { result } = renderHook(() => useAiChat({ document: mockDoc }), { wrapper });

    await act(async () => {
      await result.current.handleSend("Ping");
    });
    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearMessages();
    });
    expect(result.current.messages).toEqual([]);
  });
});
