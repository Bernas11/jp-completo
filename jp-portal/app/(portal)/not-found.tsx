import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PortalNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-jp-line bg-white p-12 text-center dark:bg-jp-blue-deep/40">
      <Compass className="h-8 w-8 text-jp-blue/60" />
      <p className="font-display uppercase text-jp-blue-deep dark:text-white">Página não encontrada</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        O que procuravas pode ter sido removido ou nunca existiu.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
