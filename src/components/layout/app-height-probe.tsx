"use client";

import { useAppHeight } from "@/shared/hooks/use-app-height";

/** Publishes `--app-height` for the shell; renders nothing. */
export function AppHeightProbe() {
  useAppHeight();
  return null;
}
