import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountDialog } from "@/features/workspace/components/account-dialog";
import { LocaleProvider } from "@/lib/i18n/locale-provider";

function renderDialog(overrides: Partial<Parameters<typeof AccountDialog>[0]> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    account: { uid: "guest-1", email: null, isAnonymous: true },
    boardCount: 2,
    onLinkAccount: vi.fn(async () => {}),
    onSignIn: vi.fn(async () => {}),
    onRecover: vi.fn(async () => {}),
    onSignOut: vi.fn(async () => {}),
    ...overrides,
  };
  render(<LocaleProvider><AccountDialog {...props} /></LocaleProvider>);
  return props;
}

describe("AccountDialog", () => {
  it("links an anonymous account instead of creating a new board identity", async () => {
    const user = userEvent.setup();
    const { onLinkAccount } = renderDialog();

    await user.type(screen.getByRole("textbox", { name: "Email address" }), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "safe-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(onLinkAccount).toHaveBeenCalledWith({ email: "ada@example.com", password: "safe-password" });
  });

  it("requires confirmation before a guest with boards signs in to another account", async () => {
    const user = userEvent.setup();
    const { onSignIn } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Already have an account? Sign in" }));
    await user.type(screen.getByRole("textbox", { name: "Email address" }), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "safe-password");
    await user.click(screen.getByRole("button", { name: /^Sign in$/ }));

    expect(onSignIn).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Sign in without merging" }));
    expect(onSignIn).toHaveBeenCalledWith({ email: "ada@example.com", password: "safe-password" });
  });
});
