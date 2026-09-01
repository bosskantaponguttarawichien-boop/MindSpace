"use client";

import { useEffect } from "react";

async function unregisterDevelopmentWorker() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  const cacheKeys = await caches.keys();
  await Promise.all(cacheKeys.map((key) => caches.delete(key)));
}

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    // The worker serves same-origin GETs cache-first, which would pin the browser to a stale
    // dev bundle (including outdated NEXT_PUBLIC_* values), so it stays production-only.
    if (process.env.NODE_ENV !== "production") {
      void unregisterDevelopmentWorker();
      return;
    }

    const register = () => {
      void navigator.serviceWorker.register("/sw.js");
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
