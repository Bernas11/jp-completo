import { Inbox, AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-jp-blue-tint">
        <Icon className="h-5 w-5 text-jp-ink-soft" strokeWidth={1.75} />
      </div>
      <div>
        <p className="font-medium text-jp-ink">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-jp-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Algo correu mal",
  description = "Não foi possível carregar esta informação. Tenta novamente dentro de instantes.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
        <AlertTriangle className="h-5 w-5 text-red-600" strokeWidth={1.75} />
      </div>
      <div>
        <p className="font-medium text-jp-ink">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-jp-ink-soft">{description}</p>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="surface-card overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-4 px-5 py-4",
            i !== rows - 1 && "border-b border-jp-line",
          )}
        >
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-jp-blue-tint2" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-jp-blue-tint2" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-jp-blue-tint2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="surface-card space-y-3 p-6">
      <div className="h-4 w-1/3 animate-pulse rounded bg-jp-blue-tint2" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-jp-blue-tint2" />
      <div className="h-24 animate-pulse rounded-xl bg-jp-blue-tint2" />
    </div>
  );
}
