"use client";

import { useState } from "react";
import { AlertTriangle, LogIn, LogOut, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AccountAuthError, type Account, type AccountCredentials } from "@/domain/auth/account";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

type Mode = "create" | "signIn" | "recovery" | "confirmSwitch";

function messageForAuthError(error: unknown): MessageKey {
  if (!(error instanceof AccountAuthError)) return "authErrorUnknown";
  const messages: Record<AccountAuthError["reason"], MessageKey> = {
    invalidEmail: "authErrorInvalidEmail",
    weakPassword: "authErrorWeakPassword",
    emailInUse: "authErrorEmailInUse",
    invalidCredentials: "authErrorInvalidCredentials",
    operationNotAllowed: "authErrorOperationNotAllowed",
    network: "authErrorNetwork",
    requiresRecentLogin: "authErrorRequiresRecentLogin",
    unknown: "authErrorUnknown",
  };
  return messages[error.reason];
}

export function AccountDialog({
  open,
  onClose,
  account,
  boardCount,
  onLinkAccount,
  onSignIn,
  onRecover,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  account: Account | null;
  boardCount: number;
  onLinkAccount: (credentials: AccountCredentials) => Promise<void>;
  onSignIn: (credentials: AccountCredentials) => Promise<void>;
  onRecover: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [mode, setMode] = useState<Mode>(account?.isAnonymous ? "create" : "signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);

  const close = () => {
    if (!busy) onClose();
  };
  const credentials = (): AccountCredentials => ({ email, password });
  const run = async (operation: () => Promise<void>, closeOnSuccess = true) => {
    setBusy(true);
    setErrorKey(null);
    try {
      await operation();
      if (closeOnSuccess) onClose();
    } catch (error: unknown) {
      setErrorKey(messageForAuthError(error));
    } finally {
      setBusy(false);
    }
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "create") return void run(() => onLinkAccount(credentials()));
    if (mode === "signIn" && account?.isAnonymous && boardCount > 0) {
      setMode("confirmSwitch");
      return;
    }
    if (mode === "signIn") return void run(() => onSignIn(credentials()));
    if (mode === "recovery") {
      return void run(async () => {
        await onRecover(email);
        setRecoverySent(true);
      }, false);
    }
  };

  if (account && !account.isAnonymous) {
    return (
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("account")}</DialogTitle>
            <DialogDescription>{account.email ?? t("accountSignedIn")}</DialogDescription>
          </DialogHeader>
          {errorKey ? <p role="alert" className="text-sm text-destructive">{t(errorKey)}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>{t("close")}</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => void run(onSignOut)}><LogOut />{t("signOut")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (mode === "confirmSwitch") {
    return (
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("accountSwitchTitle")}</DialogTitle>
            <DialogDescription>{t("accountSwitchDescription")}</DialogDescription>
          </DialogHeader>
          <p className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />{t("accountSwitchWarning")}</p>
          {errorKey ? <p role="alert" className="text-sm text-destructive">{t(errorKey)}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setMode("signIn")}>{t("cancel")}</Button>
            <Button type="button" disabled={busy} onClick={() => void run(() => onSignIn(credentials()))}><LogIn />{t("accountSwitchConfirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const isRecovery = mode === "recovery";
  const isCreate = mode === "create";
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreate ? t("createAccount") : isRecovery ? t("accountRecovery") : t("signIn")}</DialogTitle>
          <DialogDescription>{isCreate ? t("createAccountDescription") : isRecovery ? t("accountRecoveryDescription") : t("signInDescription")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          <Input aria-label={t("emailAddress")} autoFocus autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          {!isRecovery ? <Input aria-label={t("password")} autoComplete={isCreate ? "new-password" : "current-password"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /> : null}
          {errorKey ? <p role="alert" className="text-sm text-destructive">{t(errorKey)}</p> : null}
          {recoverySent ? <p role="status" className="text-sm text-emerald-600">{t("recoverySent")}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={close}>{t("cancel")}</Button>
            <Button type="submit" disabled={busy}>
              {isCreate ? <UserPlus /> : isRecovery ? <Mail /> : <LogIn />}
              {isCreate ? t("createAccount") : isRecovery ? t("sendRecovery") : t("signIn")}
            </Button>
          </DialogFooter>
        </form>
        {!isCreate && !isRecovery ? <Button type="button" variant="link" size="sm" className="justify-start px-0" onClick={() => setMode("recovery")}>{t("forgotPassword")}</Button> : null}
        {!isRecovery ? <Button type="button" variant="link" size="sm" className="justify-start px-0" onClick={() => setMode(isCreate ? "signIn" : "create")}>{isCreate ? t("alreadyHaveAccount") : t("needAccount")}</Button> : null}
        {isRecovery ? <Button type="button" variant="link" size="sm" className="justify-start px-0" onClick={() => setMode("signIn")}>{t("backToSignIn")}</Button> : null}
      </DialogContent>
    </Dialog>
  );
}
