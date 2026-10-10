"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { voteOnPoll } from "@/actions/polls";

type Option = { id: string; label: string; voteCount: number };

export function PollCard({
  pollId,
  question,
  options,
  multipleChoice,
  totalVotes,
  userVotedOptionIds,
  isClosed,
}: {
  pollId: string;
  question: string;
  options: Option[];
  multipleChoice: boolean;
  totalVotes: number;
  userVotedOptionIds: string[];
  isClosed: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(userVotedOptionIds);
  const voteAction = useAction(voteOnPoll);

  const hasVoted = userVotedOptionIds.length > 0;
  const showResults = hasVoted || isClosed;

  const toggle = (optionId: string) => {
    if (multipleChoice) {
      setSelected((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
      );
    } else {
      setSelected([optionId]);
    }
  };

  return (
    <div className="surface-card rounded-2xl border border-jp-line p-5">
      <p className="font-medium text-jp-blue-deep">{question}</p>
      {isClosed && (
        <span className="mt-1 inline-block text-xs text-muted-foreground">Sondagem encerrada</span>
      )}

      <div className="mt-4 space-y-2">
        {options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
          const isSelected = selected.includes(option.id);

          if (showResults) {
            return (
              <div key={option.id} className="relative overflow-hidden rounded-lg border border-jp-line">
                <div
                  className="absolute inset-y-0 left-0 bg-jp-blue/15"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                  <span className="flex items-center gap-1">
                    {userVotedOptionIds.includes(option.id) && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-jp-blue" />
                    )}
                    {option.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
              </div>
            );
          }

          return (
            <button
              key={option.id}
              onClick={() => toggle(option.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                isSelected ? "border-jp-blue bg-jp-blue/10" : "border-jp-line hover:bg-jp-blue/5"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {!showResults && (
        <Button
          className="mt-4 bg-jp-blue text-white hover:bg-jp-blue-deep"
          size="sm"
          disabled={selected.length === 0 || voteAction.isExecuting}
          onClick={() => voteAction.execute({ pollId, optionIds: selected })}
        >
          {voteAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Votar
        </Button>
      )}

      {voteAction.result.serverError && (
        <p className="mt-2 text-sm text-red-600">{voteAction.result.serverError}</p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">{totalVotes} votos</p>
    </div>
  );
}
