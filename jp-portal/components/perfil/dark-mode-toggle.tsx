"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Switch } from "@/components/ui/switch";
import { updateDarkMode } from "@/actions/profile";

export function DarkModeToggle({ initialValue }: { initialValue: boolean }) {
  const [checked, setChecked] = useState(initialValue);
  const { execute } = useAction(updateDarkMode);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-jp-ink dark:text-white">Modo escuro</p>
        <p className="text-xs text-muted-foreground">Aplica-se em todas as tuas sessões.</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(value) => {
          setChecked(value);
          execute({ darkMode: value });
          // aplica de imediato nesta aba, sem esperar pelo próximo carregamento da página
          document.documentElement.classList.toggle("dark", value);
        }}
      />
    </div>
  );
}
