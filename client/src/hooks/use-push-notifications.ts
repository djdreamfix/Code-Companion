import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * Convert ArrayBuffer key (p256dh/auth) to Base64 string for storage/transport.
 * Note: PushSubscription.getKey() returns an ArrayBuffer.
 */
function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

async function ensureServiceWorkerReady() {
  // Ensure SW is registered at root (so it can control the whole app)
  // This call is idempotent in modern browsers.
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

async function fetchPublicVapidKey(): Promise<string> {
  const res = await fetch("/api/push/public-key");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Public key unavailable: HTTP ${res.status} ${text}`);
  }
  const data = (await res.json()) as { publicKey?: string };
  if (!data.publicKey) throw new Error("Public key missing in response");
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
      if (!p256dh || !auth) throw new Error("Missing subscription keys (p256dh/auth)");

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
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to subscribe on server: HTTP ${res.status} ${text}`);
      }

      return res.json();
    },
    onSuccess: () => {
      setIsSubscribed(true);
      toast({
        title: "Notifications Enabled",
        description: "You will be notified when new marks appear.",
      });
    },
    onError: (err) => {
      console.error("Subscription failed:", err);
      toast({
        title: "Error",
        description: "Could not enable notifications.",
        variant: "destructive",
      });
    },
  });

  // Initial capability + status check
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
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
      } catch (e) {
        console.warn("Push init check failed:", e);
        setIsSubscribed(false);
      }
    })();
  }, []);

  const subscribe = async () => {
    if (!isSupported) return;

    try {
      // Permission must be requested from a user gesture (button click)
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permission denied");
      }

      const reg = await ensureServiceWorkerReady();

      // Always use the server-provided key (must match server VAPID)
      const publicKey = await fetchPublicVapidKey();
      const appServerKey = urlBase64ToUint8Array(publicKey);

      // If there is an existing subscription created with a different key, drop it.
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        try {
          // Attempt to detect mismatch by re-subscribing; simplest reliable approach:
          // unsubscribe existing then create a fresh subscription with the correct key.
          await existing.unsubscribe();
        } catch (e) {
          console.warn("Failed to unsubscribe existing subscription:", e);
        }
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });

      subscribeMutation.mutate(subscription);
    } catch (error) {
      console.error("Failed to subscribe:", error);
      toast({
        title: "Permission / Setup Error",
        description:
          "Could not enable notifications. Please allow notifications and try again.",
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