"use client";

import { Bot, CheckCircle2, CircleHelp, GitFork, ListPlus, ScanSearch, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/lib/i18n/locale-provider";

const actions = [
  { label: "summarize" as const, icon: Sparkles },
  { label: "expand" as const, icon: ListPlus },
  { label: "check" as const, icon: CheckCircle2 },
  { label: "mindMap" as const, icon: GitFork },
  { label: "explain" as const, icon: CircleHelp },
  { label: "improve" as const, icon: ScanSearch },
];

export function AiPanel() {
  const { t } = useLocale();
  return (
    <aside className="flex h-full flex-col bg-background">
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Bot className="size-4" /></span>
          <div><h2 className="text-sm font-bold">{t("boardAi")}</h2><Badge variant="secondary" className="mt-1 text-[10px]">{t("aiComingSoon")}</Badge></div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("aiDescription")}</p>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-2 p-4">
        {actions.map(({ label, icon: Icon }) => (
          <Button key={label} variant="outline" className="h-auto justify-start gap-2 px-3 py-2.5 text-xs" disabled title={t("futureFeature")}>
            <Icon className="size-3.5" /> {t(label)}
          </Button>
        ))}
      </div>
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div><Sparkles className="mx-auto size-5 text-primary" /><p className="mt-3 text-sm font-semibold">{t("aiComingSoon")}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("keyboardHelp")}</p></div>
      </div>
      <div className="border-t border-border p-4">
        <div className="rounded-xl border border-border bg-muted/30 p-3 opacity-60">
          <p className="text-xs text-muted-foreground">{t("askBoard")}</p>
          <p className="mt-6 text-[10px] text-muted-foreground">{t("contextEntireBoard")}</p>
        </div>
      </div>
    </aside>
  );
}
