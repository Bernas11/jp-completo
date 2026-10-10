"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Switch } from "@/components/ui/switch";
import { updateWeeklyDigestPreference } from "@/actions/notifications";

export function WeeklyDigestToggle({ initialValue }: { initialValue: boolean }) {
  const [checked, setChecked] = useState(initialValue);
  const { execute } = useAction(updateWeeklyDigestPreference);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-jp-ink dark:text-white">Resumo semanal por email</p>
        <p className="text-xs text-muted-foreground">Novidades da tua comunidade, uma vez por semana.</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(value) => {
          setChecked(value);
          execute({ optIn: value });
        }}
      />
    </div>
  );
}
