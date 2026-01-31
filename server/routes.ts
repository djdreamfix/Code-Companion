import type { Express } from "express";
import type { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { randomUUID } from "crypto";
import webpush from "web-push";

function isVapidMismatch(err: any) {
  const body = err?.body;
  const msg = typeof body === "string" ? body : JSON.stringify(body ?? "");
  return (
    err?.statusCode === 403 ||
    msg.includes("VapidPkHashMismatch") ||
    (msg.toLowerCase().includes("vapid") && msg.toLowerCase().includes("mismatch"))
  );
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Safety: show real startup errors in Render logs
  process.on("unhandledRejection", (err) => console.error("unhandledRejection:", err));
  process.on("uncaughtException", (err) => console.error("uncaughtException:", err));

  // Web Push (optional)
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  const webPushEnabled = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

  if (webPushEnabled) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);

    app.get("/api/push/public-key", (req, res) => {
      res.json({ publicKey: VAPID_PUBLIC_KEY });
    });
  } else {
    console.warn("WebPush disabled: missing VAPID keys");

    app.get("/api/push/public-key", (req, res) => {
      res.status(503).json({ error: "WebPush disabled" });
    });
  }

  // Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: ["https://code-companion-fghd.onrender.com"],
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
  });

  // List Marks
  app.get(api.marks.list.path, async (req, res) => {
    const marks = await storage.getMarks();
    res.json(marks);
  });

  // Create Mark
  app.post(api.marks.create.path, async (req, res) => {
    try {
      const input = api.marks.create.input.parse(req.body);

      // Нормалізація (після schema transform note/street вже або string, або undefined)
      const note = input.note ?? null;
      const street = input.street ?? "Location";

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

      const newMark = await storage.createMark({
        id: randomUUID(),
        lat: input.lat,
        lng: input.lng,
        color: input.color,
        createdAt: now,
        expiresAt,
        street,
        note,
      });

      io.emit("mark.created", newMark);

      // Push (only if enabled)
      if (webPushEnabled) {
        const colorUa =
          input.color === "blue" ? "синю" : input.color === "green" ? "зелену" : "змішану";

        const payload = JSON.stringify({
          title: "Нова мітка!",
          body: `Додано нову ${colorUa} мітку.`,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: { id: newMark.id, url: `/?mark=${newMark.id}` },
        });

        const subs = await storage.getSubscriptions();

        await Promise.allSettled(
          subs.map(async (sub) => {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys as any },
                payload
              );
            } catch (err: any) {
              // 404/410 = subscription expired
              if (err?.statusCode === 410 || err?.statusCode === 404) {
                await storage.deleteSubscription(sub.endpoint);
                return;
              }

              // VAPID mismatch = subscription created with another VAPID public key
              if (isVapidMismatch(err)) {
                console.error(
                  "webpush vapid mismatch -> deleting subscription",
                  sub.endpoint
                );
                await storage.deleteSubscription(sub.endpoint);
                return;
              }

              console.error("webpush error", err?.statusCode, err?.body || err);
            }
          })
        );
      }

      res.status(201).json(newMark);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.message });
      } else {
        console.error("Create mark error:", err);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // Subscribe to Push
  app.post(api.push.subscribe.path, async (req, res) => {
    try {
      if (!webPushEnabled) {
        return res.status(503).json({ error: "WebPush disabled" });
      }

      const input = api.push.subscribe.input.parse(req.body);

      await storage.createSubscription({
        id: randomUUID(),
        endpoint: input.endpoint,
        keys: input.keys,
        createdAt: new Date(),
      });

      res.status(201).json({ ok: true });
    } catch {
      res.status(400).json({ error: "Invalid subscription" });
    }
  });

  // Cleanup job
  setInterval(async () => {
    const deletedIds = await storage.deleteExpiredMarks();
    deletedIds.forEach((id) => io.emit("mark.expired", { id }));
  }, 10000);

  return httpServer;
}
