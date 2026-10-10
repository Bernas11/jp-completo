"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { searchProfilesToMessage } from "@/actions/messages";
import { roleLabel } from "@/lib/roles";

type Result = { id: string; display_name: string; role: string };

export function NewConversationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);

  async function runSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await searchProfilesToMessage({ query: value.trim() });
    setResults((res?.data?.results as Result[]) ?? []);
    setSearching(false);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Nova conversa
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-jp-line">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-jp-blue-deep">Nova Conversa</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Procurar por nome…"
                value={query}
                onChange={(e) => runSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto">
              {searching && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
              {!searching &&
                results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/mensagens/${r.id}`);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-jp-blue/5"
                  >
                    <span className="font-medium text-jp-ink dark:text-white">{r.display_name}</span>
                    <span className="text-xs text-muted-foreground">{roleLabel(r.role)}</span>
                  </button>
                ))}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">Ninguém encontrado.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
