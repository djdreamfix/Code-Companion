import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function ensureServiceWorkerReady() {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

async function fetchPublicVapidKey(): Promise<string> {
  const res = await fetch("/api/push/public-key");

  if (!res.ok) {
    throw new Error("Не вдалося отримати публічний ключ сповіщень");
  }

  const data = await res.json();
  if (!data.publicKey) {
    throw new Error("Публічний ключ відсутній");
  }

  return data.publicKey;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const subscribeMutation = useMutation({
    mutationFn: async (subscription: PushSubscription) => {
      const p256dh = subscription.getKey("p256dh");
      const auth = subscription.getKey("auth");

      if (!p256dh || !auth) {
        throw new Error("Відсутні ключі підписки");
      }

      const body = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(p256dh),
          auth: arrayBufferToBase64(auth),
        },
      };

      const res = await fetch(api.push.subscribe.path, {
        method: api.push.subscribe.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Не вдалося зберегти підписку");
      }

      return res.json();
    },

    onSuccess: () => {
      setIsSubscribed(true);
      toast({
        title: "Сповіщення увімкнено",
        description: "Ви будете отримувати повідомлення про нові мітки.",
      });
    },

    onError: (err) => {
      console.error("Push subscribe error:", err);
      toast({
        title: "Помилка",
        description: "Не вдалося увімкнути сповіщення.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);

    if (!supported) return;

    (async () => {
      try {
        const reg = await ensureServiceWorkerReady();
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch {
        setIsSubscribed(false);
      }
    })();
  }, []);

  const subscribe = async () => {
    if (!isSupported) return;

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Дозвіл не надано");
      }

      const reg = await ensureServiceWorkerReady();
      const publicKey = await fetchPublicVapidKey();

      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      subscribeMutation.mutate(subscription);
    } catch (error) {
      console.error("Subscribe failed:", error);
      toast({
        title: "Дозвіл відхилено",
        description: "Дозвольте сповіщення в налаштуваннях браузера.",
        variant: "destructive",
      });
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscribe,
    isLoading: subscribeMutation.isPending,
  };
}