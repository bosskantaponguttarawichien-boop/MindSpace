"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { type Locale, type MessageKey, translate } from "@/lib/i18n/messages";

const STORAGE_KEY = "mindspace.locale.v1";
const localeListeners = new Set<() => void>();

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readPreferredLocale(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "th" || stored === "en") return stored;
  return window.navigator.language.toLowerCase().startsWith("th") ? "th" : "en";
}

function subscribeToLocale(listener: () => void) {
  localeListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    localeListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore<Locale>(subscribeToLocale, readPreferredLocale, () => "en");

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    localeListeners.forEach((listener) => listener());
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (key) => translate(locale, key) }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
