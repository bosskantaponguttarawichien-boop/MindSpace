import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAnonymousUser: vi.fn(),
  getFirebaseServices: vi.fn(() => ({ auth: { id: "auth" } })),
  credential: vi.fn(),
  linkWithCredential: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock("@/infrastructure/auth/firebase-anonymous-auth", () => ({ getAnonymousUser: mocks.getAnonymousUser }));
vi.mock("@/infrastructure/firebase/client", () => ({ getFirebaseServices: mocks.getFirebaseServices }));
vi.mock("firebase/auth", () => ({
  EmailAuthProvider: { credential: mocks.credential },
  linkWithCredential: mocks.linkWithCredential,
  onAuthStateChanged: mocks.onAuthStateChanged,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  signOut: mocks.signOut,
}));

const { linkAnonymousAccount, signInToAccount } = await import("@/infrastructure/auth/firebase-email-password-auth");

describe("firebase email/password auth", () => {
  it("links an anonymous user so the existing UID remains the board owner", async () => {
    const anonymousUser = { uid: "guest-uid", email: null, isAnonymous: true };
    mocks.getAnonymousUser.mockResolvedValueOnce(anonymousUser);
    mocks.credential.mockReturnValueOnce({ providerId: "password" });
    mocks.linkWithCredential.mockResolvedValueOnce({ user: { uid: "guest-uid", email: "ada@example.com", isAnonymous: false } });

    await expect(linkAnonymousAccount({ email: " ada@example.com ", password: "safe-password" })).resolves.toEqual({
      uid: "guest-uid",
      email: "ada@example.com",
      isAnonymous: false,
    });
    expect(mocks.linkWithCredential).toHaveBeenCalledWith(anonymousUser, { providerId: "password" });
  });

  it("normalizes provider failures instead of exposing the provider message", async () => {
    mocks.signInWithEmailAndPassword.mockRejectedValueOnce({ code: "auth/wrong-password", message: "raw provider detail" });

    await expect(signInToAccount({ email: "ada@example.com", password: "safe-password" })).rejects.toMatchObject({
      name: "AccountAuthError",
      reason: "invalidCredentials",
      message: "invalidCredentials",
    });
  });
});
