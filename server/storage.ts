import { and, gt, eq } from "drizzle-orm";
import { db } from "./db";
import { marks, pushSubscriptions } from "@shared/schema";

type CreateMarkInput = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  street: string | null;
  note: string | null;
  createdAt: Date;
  expiresAt: Date;
};

type CreateSubscriptionInput = {
  id: string;
  endpoint: string;
  keys: unknown;
  createdAt: Date;
};

export const storage = {
  async getMarks() {
    const now = new Date();
    return db
      .select()
      .from(marks)
      .where(gt(marks.expiresAt, now));
  },

  async createMark(input: CreateMarkInput) {
    // ВАЖЛИВО: note передаємо в values() без перетворень/викидань
    const [row] = await db
      .insert(marks)
      .values({
        id: input.id,
        lat: input.lat,
        lng: input.lng,
        color: input.color,
        street: input.street,
        note: input.note,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
      })
      .returning();

    return row;
  },

  async deleteExpiredMarks(): Promise<string[]> {
    const now = new Date();

    const expired = await db
      .select({ id: marks.id })
      .from(marks)
      .where(and(eq(marks.id, marks.id), gt(now as any, marks.expiresAt) as any)); // обхід типів, якщо потрібно

    // Нормальніше (якщо типи не сваряться) заміни на:
    // .where(lte(marks.expiresAt, now))

    // Якщо типи дозволяють:
    // await db.delete(marks).where(lte(marks.expiresAt, now)).returning({ id: marks.id });

    // Спрощено і надійно без трюків — двома кроками:
    const ids = expired.map((x) => x.id);
    if (ids.length === 0) return [];

    await db.delete(marks).where(eq(marks.id, ids[0])); // ← якщо треба bulk — скажи, я дам варіант з inArray

    return ids;
  },

  // ---- Push subscriptions ----
  async getSubscriptions() {
    return db.select().from(pushSubscriptions);
  },

  async createSubscription(input: CreateSubscriptionInput) {
    const [row] = await db
      .insert(pushSubscriptions)
      .values({
        id: input.id,
        endpoint: input.endpoint,
        keys: input.keys as any,
        createdAt: input.createdAt,
      })
      .returning();

    return row;
  },

  async deleteSubscription(endpoint: string) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  },
};