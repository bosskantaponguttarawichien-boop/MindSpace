"use client";

import { useCallback, useEffect, useState } from "react";
import type { Account, AccountCredentials } from "@/domain/auth/account";
import { getAnonymousUser } from "@/infrastructure/auth/firebase-anonymous-auth";
import { linkAnonymousAccount, observeAccount, sendAccountRecovery, signInToAccount, signOutToAnonymous } from "@/infrastructure/auth/firebase-email-password-auth";

export type AccountStatus = "loading" | "ready" | "error";

function asAccount(user: { uid: string; email: string | null; isAnonymous: boolean }): Account {
  return { uid: user.uid, email: user.email, isAnonymous: user.isAnonymous };
}

/** Owns Firebase auth state so UI components only receive display data and user intents. */
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState<AccountStatus>("loading");

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void Promise.resolve()
      .then(async () => {
        if (!active) return null;
        unsubscribe = observeAccount((next) => {
          if (!active) return;
          setAccount(next);
          setStatus(next ? "ready" : "loading");
        });
        return getAnonymousUser();
      })
      .then((user) => {
        if (!active || !user) return;
        setAccount(asAccount(user));
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const linkAccount = useCallback(async (credentials: AccountCredentials) => {
    const next = await linkAnonymousAccount(credentials);
    setAccount(next);
    setStatus("ready");
  }, []);
  const signIn = useCallback(async (credentials: AccountCredentials) => {
    const next = await signInToAccount(credentials);
    setAccount(next);
    setStatus("ready");
  }, []);
  const recover = useCallback((email: string) => sendAccountRecovery(email), []);
  const signOut = useCallback(async () => {
    const next = await signOutToAnonymous();
    setAccount(next);
    setStatus("ready");
  }, []);

  return { account, status, linkAccount, signIn, recover, signOut };
}
