"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { updateDisplayName } from "@/actions/profile";

export function EditNameField({ initialName }: { initialName: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);

  const { execute, status } = useAction(updateDisplayName, {
    onSuccess: () => {
      setSavedName(value.trim());
      setEditing(false);
    },
  });

  const saving = status === "executing";

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(savedName);
          setEditing(true);
        }}
        className="group flex items-center gap-2 text-left"
      >
        <p className="font-display text-2xl text-jp-blue-deep dark:text-white">{savedName}</p>
        <Pencil className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() && value.trim() !== savedName) {
          execute({ displayName: value.trim() });
        } else {
          setEditing(false);
        }
      }}
      className="flex items-center gap-2"
    >
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="max-w-[220px]"
        maxLength={80}
        disabled={saving}
      />
      <button type="submit" disabled={saving} className="rounded-full p-1.5 text-green-600 hover:bg-green-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => setEditing(false)}
        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}
