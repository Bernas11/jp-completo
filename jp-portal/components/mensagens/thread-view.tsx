"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendDirectMessage, markConversationRead } from "@/actions/messages";

type Message = { id: string; body: string; createdAt: string; fromMe: boolean };

export function ThreadView({
  otherProfileId,
  otherName,
  initialMessages,
  myId,
}: {
  otherProfileId: string;
  otherName: string;
  initialMessages: Message[];
  myId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingIdRef = useRef<string | null>(null);

  const sendAction = useAction(sendDirectMessage, {
    onSuccess: () => setBody(""),
    onError: () => {
      const failedId = pendingIdRef.current;
      if (!failedId) return;
      setMessages((prev) => {
        const failedMessage = prev.find((m) => m.id === failedId);
        if (failedMessage) setBody(failedMessage.body);
        return prev.filter((m) => m.id !== failedId);
      });
    },
  });
  const markReadAction = useAction(markConversationRead);

  useEffect(() => {
    markReadAction.execute({ otherProfileId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherProfileId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    const optimisticId = `optimistic-${Date.now()}`;
    pendingIdRef.current = optimisticId;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, body: trimmed, createdAt: new Date().toISOString(), fromMe: true },
    ]);
    sendAction.execute({ recipientId: otherProfileId, body: trimmed });
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col">
      <h1 className="mb-4 font-display uppercase text-2xl text-jp-blue-deep">{otherName}</h1>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                m.fromMe
                  ? "bg-jp-blue text-white"
                  : "border border-jp-line bg-white text-jp-ink dark:bg-jp-blue-deep/40 dark:text-white"
              }`}
            >
              {m.body}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-jp-line pt-4">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escreve uma mensagem…"
          className="h-10 flex-1 rounded-full border border-jp-line bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-blue"
        />
        <Button size="icon" onClick={handleSend} disabled={sendAction.isExecuting || !body.trim()}>
          {sendAction.isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {sendAction.result.serverError && (
        <p className="mt-1 text-xs text-red-600">{sendAction.result.serverError}</p>
      )}
    </div>
  );
}
