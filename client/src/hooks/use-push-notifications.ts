import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

const PUBLIC_VAPID_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"; // Only for dev example, ideally from env

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const subscribeMutation = useMutation({
    mutationFn: async (subscription: PushSubscription) => {
      const p256dh = subscription.getKey("p256dh");
      const auth = subscription.getKey("auth");
      
      if (!p256dh || !auth) throw new Error("Missing keys");

      const body = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
          auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
        }
      };
      
      const res = await fetch(api.push.subscribe.path, {
        method: api.push.subscribe.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to subscribe on server");
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
    }
  });

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      
      // Check current status
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const subscribe = async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permission denied");
      }

      // VAPID key would typically come from an API endpoint configuration
      // For this demo, assuming it's available or hardcoded for the prototype
      // In a real app, fetch /api/push/config first
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY) 
      });

      subscribeMutation.mutate(subscription);
    } catch (error) {
      console.error("Failed to subscribe:", error);
      toast({
        title: "Permission Denied",
        description: "Please allow notifications in your browser settings.",
        variant: "destructive",
      });
    }
  };

  return { isSupported, isSubscribed, subscribe, isLoading: subscribeMutation.isPending };
}
