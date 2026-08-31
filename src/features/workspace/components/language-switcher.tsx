"use client";

import { Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Locale } from "@/lib/i18n/messages";

const localeOptions: Array<{ value: Locale; labelKey: "english" | "thai" }> = [
  { value: "en", labelKey: "english" },
  { value: "th", labelKey: "thai" },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" aria-label={t("language")}>
          <Languages className="size-4" />
          <span className="hidden sm:inline">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        {localeOptions.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => setLocale(option.value)}>
            <span className="flex-1">{t(option.labelKey)}</span>
            {locale === option.value ? <Check className="size-4" aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
