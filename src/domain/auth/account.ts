export type Account = {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
};

export type AccountCredentials = {
  email: string;
  password: string;
};

export type AccountAuthFailureReason =
  | "invalidEmail"
  | "weakPassword"
  | "emailInUse"
  | "invalidCredentials"
  | "operationNotAllowed"
  | "network"
  | "requiresRecentLogin"
  | "unknown";

/** A safe, localized-at-the-UI error classification. Never expose provider error text. */
export class AccountAuthError extends Error {
  constructor(readonly reason: AccountAuthFailureReason) {
    super(reason);
    this.name = "AccountAuthError";
  }
}
