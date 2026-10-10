import { AlertCircle } from "lucide-react";

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-jp-line bg-white p-10 text-center dark:bg-jp-blue-deep/40">
      <AlertCircle className="h-8 w-8 text-red-500/80" />
      <p className="text-sm font-medium text-jp-ink dark:text-white">{message}</p>
      <p className="text-xs text-muted-foreground">
        Tenta atualizar a página. Se o problema persistir, contacta o suporte.
      </p>
    </div>
  );
}
