import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiPanel } from "@/features/ai/components/ai-panel";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import type { BoardDocument } from "@/domain/board/board-document";

const mockDocument: BoardDocument = {
  version: 1,
  id: "board:test",
  name: "Test Board",
  elements: [
    { id: "element:1", kind: "note", x: 100, y: 100, width: 200, height: 120, text: "Central Plan", color: "violet" },
    { id: "element:2", kind: "rectangle", x: 400, y: 100, width: 160, height: 80, text: "Key Objective", color: "blue" },
  ],
  connections: [],
};

describe("AiPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders AI panel with context scope toggle", () => {
    render(
      <LocaleProvider>
        <AiPanel document={mockDocument} selectedIds={["element:1"]} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("complementary", { name: "Board AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entire board (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selected items (1)" })).toBeInTheDocument();
  });

  it("triggers quick action, shows user message, and receives response", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      text: "Summary of your board: contains Central Plan and Key Objective.",
      provider: "mock-ai",
      isMock: true,
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <LocaleProvider>
        <AiPanel document={mockDocument} />
      </LocaleProvider>,
    );

    const summarizeBtn = screen.getByRole("button", { name: "Summarize" });
    await user.click(summarizeBtn);

    expect(screen.getByText("✦ Summarize")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Summary of your board: contains Central Plan and Key Objective.")).toBeInTheDocument();
    });
  });

  it("offers proofread as a quick action", async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "No spelling issues found.", provider: "mock-ai", isMock: true }),
    });

    render(<LocaleProvider><AiPanel document={mockDocument} /></LocaleProvider>);
    await user.click(screen.getByRole("button", { name: "Proofread" }));

    await waitFor(() => expect(screen.getByText("No spelling issues found.")).toBeInTheDocument());
  });

  it("displays proposal card and calls onApplyProposal when Approved", async () => {
    const user = userEvent.setup();
    const onApplyProposal = vi.fn();
    const mockResponse = {
      text: "I propose expanding with two branches.",
      proposal: {
        id: "prop-123",
        title: "Marketing & Sales",
        explanation: "Add commercial branches to the plan.",
        elements: [
          { kind: "note", text: "Marketing Push", color: "orange" },
          { kind: "note", text: "Sales Pipeline", color: "teal" },
        ],
      },
      provider: "mock-ai",
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <LocaleProvider>
        <AiPanel document={mockDocument} onApplyProposal={onApplyProposal} />
      </LocaleProvider>,
    );

    const expandBtn = screen.getByRole("button", { name: "Expand" });
    await user.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText("Marketing & Sales")).toBeInTheDocument();
      expect(screen.getByText("Add commercial branches to the plan.")).toBeInTheDocument();
      expect(screen.getByText("Marketing Push")).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole("button", { name: "Approve changes" });
    await user.click(approveBtn);

    expect(onApplyProposal).toHaveBeenCalledWith(mockResponse.proposal);
    expect(screen.getByText("Changes added to board (Undoable)")).toBeInTheDocument();
  });

  it("dismisses proposal when Rejected without calling onApplyProposal", async () => {
    const user = userEvent.setup();
    const onApplyProposal = vi.fn();
    const mockResponse = {
      text: "Here is a proposal.",
      proposal: {
        id: "prop-456",
        title: "Alternative idea",
        explanation: "Different direction.",
        elements: [{ kind: "note", text: "Pivot strategy" }],
      },
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <LocaleProvider>
        <AiPanel document={mockDocument} onApplyProposal={onApplyProposal} />
      </LocaleProvider>,
    );

    const checkBtn = screen.getByRole("button", { name: "Check facts" });
    await user.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText("Alternative idea")).toBeInTheDocument();
    });

    const rejectBtn = screen.getByRole("button", { name: "Reject" });
    await user.click(rejectBtn);

    expect(onApplyProposal).not.toHaveBeenCalled();
    expect(screen.getByText("Proposal dismissed")).toBeInTheDocument();
  });

  it("displays connector update proposal and approves it", async () => {
    const user = userEvent.setup();
    const onApplyProposal = vi.fn();
    const mockResponse = {
      text: "I propose changing connector heads to circle.",
      proposal: {
        id: "prop-conn-1",
        title: "Change connector heads to circle",
        explanation: "Update all connectors with circle heads.",
        updateConnections: [{ headType: "circle" }],
      },
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <LocaleProvider>
        <AiPanel document={mockDocument} onApplyProposal={onApplyProposal} />
      </LocaleProvider>,
    );

    const input = screen.getByPlaceholderText("Ask MindSpace AI...");
    await user.type(input, "เปลี่ยนหัว connector ทุกอันเป็นวงกลม");
    const sendBtn = screen.getByTitle("Send");
    await user.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText("Change connector heads to circle")).toBeInTheDocument();
      expect(screen.getByText("head → circle")).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole("button", { name: "Approve changes" });
    await user.click(approveBtn);

    expect(onApplyProposal).toHaveBeenCalledWith(mockResponse.proposal);
  });

  it("calls onClose when the collapse button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <LocaleProvider>
        <AiPanel document={mockDocument} onClose={onClose} />
      </LocaleProvider>,
    );

    const collapseBtn = screen.getByRole("button", { name: "Collapse AI panel" });
    await user.click(collapseBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reports status changes during AI generation", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    const mockResponse = {
      text: "Summary complete.",
      isMock: true,
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <LocaleProvider>
        <AiPanel document={mockDocument} onStatusChange={onStatusChange} />
      </LocaleProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Summarize" }));

    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ loading: true, text: "Summarize" }),
    );

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({ loading: false, hasUnread: true }),
      );
    });
  });
});
