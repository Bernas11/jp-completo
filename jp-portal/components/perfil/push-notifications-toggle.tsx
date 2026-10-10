"use client";

import { useEffect, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Switch } from "@/components/ui/switch";
import { savePushSubscription, removePushSubscription } from "@/actions/push";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationsToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [checked, setChecked] = useState(false);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveAction = useAction(savePushSubscription);
  const removeAction = useAction(removePushSubscription);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);

    navigator.serviceWorker.register("/push-sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setChecked(!!existing);
    });
  }, []);

  if (!supported || !vapidPublicKey) return null;

  async function toggle(value: boolean) {
    setError(null);
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.register("/push-sw.js");

      if (value) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setError("As notificações foram bloqueadas nas definições do navegador.");
          setBusy(false);
          return;
        }
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!),
        });
        const json = subscription.toJSON();
        await saveAction.executeAsync({
          endpoint: json.endpoint!,
          keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
        });
        setChecked(true);
      } else {
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await removeAction.executeAsync({ endpoint: existing.endpoint });
          await existing.unsubscribe();
        }
        setChecked(false);
      }
    } catch (err) {
      console.error("Erro ao (des)ativar notificações push:", err);
      setError("Não foi possível atualizar as notificações push.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-jp-ink dark:text-white">Notificações push</p>
        <p className="text-xs text-muted-foreground">
          {error ?? "Avisos, respostas e eventos diretamente neste dispositivo."}
        </p>
      </div>
      <Switch checked={checked} disabled={busy} onCheckedChange={toggle} />
    </div>
  );
}
