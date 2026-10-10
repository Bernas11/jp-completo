"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { DEMO_MODE } from "@/lib/features";

export default function Newsletter() {
  if (DEMO_MODE) {
    return (
      <p className="max-w-xs text-xs leading-relaxed text-white/60">
        Newsletter desativada nesta demonstração. Não introduzas o teu email.
      </p>
    );
  }

  return <ActiveNewsletter />;
}

function ActiveNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "erro">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "ok" : "erro");
      if (res.ok) setEmail("");
    } catch {
      setStatus("erro");
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-2 max-w-xs">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="O teu email"
        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/8 border border-white/15 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-jp-yellow"
      />
      <button type="submit" aria-label="Subscrever" className="shrink-0 bg-jp-yellow text-jp-blue-deep rounded-lg px-3 flex items-center justify-center hover:brightness-95">
        <Send size={14} />
      </button>
      {status === "ok" && <p className="text-jp-yellow text-xs mt-1 absolute">Subscrito!</p>}
      {status === "erro" && <p role="alert" className="text-red-300 text-xs mt-1 absolute">Não foi possível subscrever.</p>}
    </form>
  );
}
