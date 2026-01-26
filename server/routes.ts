import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { randomUUID } from "crypto";
import webpush from "web-push";

// Generated keys for demo purposes
const VAPID_KEYS = {
  publicKey: "BG6M1vEE3vDPhOJCkQiLZOpyE2xzk2cUuxOMRXulqMR90WNOBZNn51kvoDyhMutsWX8qWzROzEBckQk3ylQiOis",
  privateKey: "RgKrwzUtiQRanmqHG5YtHsiwWx8OXo2Ar2A00EE28Eo",
  subject: "mailto:admin@example.com"
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Web Push
  webpush.setVapidDetails(
    VAPID_KEYS.subject,
    VAPID_KEYS.publicKey,
    VAPID_KEYS.privateKey
  );

  // Setup Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
  });

  // API Routes

  // Helper to get VAPID key
  app.get("/api/push/public-key", (req, res) => {
    res.json({ publicKey: VAPID_KEYS.publicKey });
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
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins

      const newMark = await storage.createMark({
        id: randomUUID(),
        lat: input.lat,
        lng: input.lng,
        color: input.color,
        createdAt: now,
        expiresAt: expiresAt,
        street: "Location", // Can implement geocoding here or on frontend
      });

      // Broadcast to socket
      io.emit("mark.created", newMark);

      // Send Push Notification
      const colorName = input.color === 'blue' ? 'Blue' : input.color === 'green' ? 'Green' : 'Split';
      const payload = JSON.stringify({
        title: "New Mark!",
        body: `A new ${colorName} mark was placed.`,
        icon: "/icons/icon-192.png",
        data: { id: newMark.id }
      });

      const subs = await storage.getSubscriptions();
      subs.forEach(sub => {
        webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: sub.keys as any
        }, payload).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await storage.deleteSubscription(sub.endpoint);
          }
        });
      });

      res.status(201).json(newMark);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // Subscribe to Push
  app.post(api.push.subscribe.path, async (req, res) => {
    try {
      const input = api.push.subscribe.input.parse(req.body);
      
      await storage.createSubscription({
        id: randomUUID(),
        endpoint: input.endpoint,
        keys: input.keys,
        createdAt: new Date()
      });

      res.status(201).json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: "Invalid subscription" });
    }
  });

  // Background Job: Cleanup Expired Marks
  setInterval(async () => {
    const deletedIds = await storage.deleteExpiredMarks();
    if (deletedIds.length > 0) {
      deletedIds.forEach(id => {
        io.emit("mark.expired", { id });
      });
    }
  }, 10000); // Check every 10 seconds

  return httpServer;
}
