"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Erro na área do Portal:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-jp-line bg-white p-12 text-center dark:bg-jp-blue-deep/40">
      <AlertTriangle className="h-8 w-8 text-red-500/80" />
      <p className="font-display uppercase text-jp-blue-deep dark:text-white">Algo correu mal</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Não foi possível carregar esta página. Podes tentar novamente.
      </p>
      <Button onClick={reset} className="mt-2">
        <RotateCw className="mr-2 h-4 w-4" /> Tentar novamente
      </Button>
    </div>
  );
}
