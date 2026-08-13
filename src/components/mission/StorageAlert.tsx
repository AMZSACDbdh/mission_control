import { AlertTriangle, Download } from "lucide-react";

import { downloadBackup } from "@/lib/backup";
import { formatBytes } from "@/services/store";
import { useActivity } from "@/hooks/use-activity";

/**
 * The one warning this app must never fail to show.
 *
 * Browser storage is finite and this ledger grows forever. When writes start
 * failing, the interface still *looks* correct — in-memory state is fine — so
 * without this banner a user would keep working for days while nothing is
 * saved, and lose all of it on the next refresh.
 *
 * Two states: approaching the limit (act soon) and writes already failing
 * (act now). Both offer the same escape hatch — export.
 *
 * A platform with no meaningful quota reports `usage` as null, and the warning
 * simply never appears — this component needs no knowledge of which platform it
 * is running on.
 */
export function StorageAlert() {
  const { writeError, usage } = useActivity();

  const failing = writeError !== null;
  const warning = !failing && usage?.nearingLimit === true;

  if (!failing && !warning) return null;

  return (
    <div
      role="alert"
      className={`mb-6 flex flex-wrap items-start gap-4 rounded-xl border p-4 ${
        failing ? "border-rose-800/60 bg-rose-950/25" : "border-gold/40 bg-gold/8"
      }`}
    >
      <AlertTriangle
        className={`mt-0.5 size-5 shrink-0 ${failing ? "text-rose-400" : "text-gold"}`}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${failing ? "text-rose-200" : "text-foreground"}`}>
          {failing ? "Your changes are not being saved" : "Storage is filling up"}
        </p>
        <p className="mt-1 text-[0.78rem] leading-relaxed text-muted-foreground">
          {failing
            ? writeError
            : `Mission Control is using ${formatBytes(usage!.bytes)} of roughly ${formatBytes(
                usage!.quota,
              )} (${usage!.percent}%). Export a backup now so nothing is at risk.`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => void downloadBackup()}
        className="flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-linear-to-r from-gold-dim via-gold to-gold-soft px-5 text-[0.65rem] font-bold tracking-[0.14em] text-primary-foreground uppercase transition-all hover:brightness-110"
      >
        <Download className="size-3.5" />
        Export now
      </button>
    </div>
  );
}
