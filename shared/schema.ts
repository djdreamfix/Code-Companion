import { pgTable, text, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const marks = pgTable("marks", {
  id: text("id").primaryKey(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  color: text("color").notNull(), // 'blue' | 'green' | 'split'
  street: text("street"),
  createdAt: timestamp("created_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey(),
  endpoint: text("endpoint").notNull(),
  keys: jsonb("keys").notNull(), // { p256dh: string; auth: string }
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertMarkSchema = createInsertSchema(marks);
export const insertSubscriptionSchema = createInsertSchema(pushSubscriptions);

// === TYPES ===
export type Mark = typeof marks.$inferSelect;
export type InsertMark = z.infer<typeof insertMarkSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertSubscriptionSchema>;

// API Types
export type MarkColor = 'blue' | 'green' | 'split';

export const createMarkSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  color: z.enum(['blue', 'green', 'split']),
});

export const subscribeSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});
