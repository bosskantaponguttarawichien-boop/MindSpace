import {
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { AccountAuthError, type Account, type AccountAuthFailureReason, type AccountCredentials } from "@/domain/auth/account";
import { getAnonymousUser } from "@/infrastructure/auth/firebase-anonymous-auth";
import { getFirebaseServices } from "@/infrastructure/firebase/client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toAccount(user: User): Account {
  return { uid: user.uid, email: user.email, isAnonymous: user.isAnonymous };
}

function validateEmail(email: string): string {
  const normalized = email.trim();
  if (!emailPattern.test(normalized)) throw new AccountAuthError("invalidEmail");
  return normalized;
}

function validateCredentials(credentials: AccountCredentials) {
  const email = validateEmail(credentials.email);
  if (credentials.password.length < 8) throw new AccountAuthError("weakPassword");
  return { email, password: credentials.password };
}

function normalizeAuthFailure(error: unknown): AccountAuthError {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : "";
  const reasons: Record<string, AccountAuthFailureReason> = {
    "auth/invalid-email": "invalidEmail",
    "auth/weak-password": "weakPassword",
    "auth/email-already-in-use": "emailInUse",
    "auth/invalid-credential": "invalidCredentials",
    "auth/user-not-found": "invalidCredentials",
    "auth/wrong-password": "invalidCredentials",
    "auth/operation-not-allowed": "operationNotAllowed",
    "auth/network-request-failed": "network",
    "auth/requires-recent-login": "requiresRecentLogin",
  };
  const reason = reasons[code] ?? "unknown";
  return new AccountAuthError(reason);
}

export function observeAccount(listener: (account: Account | null) => void) {
  return onAuthStateChanged(getFirebaseServices().auth, (user) => listener(user ? toAccount(user) : null));
}

/** Links the current anonymous UID so its user-scoped boards remain owned by the new account. */
export async function linkAnonymousAccount(credentials: AccountCredentials): Promise<Account> {
  const { email, password } = validateCredentials(credentials);
  const user = await getAnonymousUser();
  if (!user.isAnonymous) throw new AccountAuthError("operationNotAllowed");
  try {
    const credential = EmailAuthProvider.credential(email, password);
    const result = await linkWithCredential(user, credential);
    return toAccount(result.user);
  } catch (error: unknown) {
    throw normalizeAuthFailure(error);
  }
}

/** Existing-account sign-in deliberately does not merge the current guest workspace. */
export async function signInToAccount(credentials: AccountCredentials): Promise<Account> {
  const { email, password } = validateCredentials(credentials);
  try {
    const result = await signInWithEmailAndPassword(getFirebaseServices().auth, email, password);
    return toAccount(result.user);
  } catch (error: unknown) {
    throw normalizeAuthFailure(error);
  }
}

export async function sendAccountRecovery(email: string) {
  try {
    await sendPasswordResetEmail(getFirebaseServices().auth, validateEmail(email));
  } catch (error: unknown) {
    throw normalizeAuthFailure(error);
  }
}

/** Signing out immediately begins a fresh anonymous session, preserving the guest-first board experience. */
export async function signOutToAnonymous(): Promise<Account> {
  try {
    await signOut(getFirebaseServices().auth);
    return toAccount(await getAnonymousUser());
  } catch (error: unknown) {
    throw normalizeAuthFailure(error);
  }
}
