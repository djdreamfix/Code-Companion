import { marks, pushSubscriptions, type Mark, type InsertMark, type PushSubscription, type InsertPushSubscription } from "@shared/schema";
import { db } from "./db";
import { eq, gt, lt } from "drizzle-orm";

export interface IStorage {
  // Marks
  getMarks(): Promise<Mark[]>;
  createMark(mark: InsertMark): Promise<Mark>;
  deleteExpiredMarks(): Promise<string[]>; // Returns deleted IDs

  // Push
  createSubscription(sub: InsertPushSubscription): Promise<void>;
  getSubscriptions(): Promise<PushSubscription[]>;
  deleteSubscription(endpoint: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getMarks(): Promise<Mark[]> {
    // Return marks that have NOT expired yet
    return await db.select().from(marks).where(gt(marks.expiresAt, new Date()));
  }

  async createMark(mark: InsertMark): Promise<Mark> {
    const [newMark] = await db.insert(marks).values(mark).returning();
    return newMark;
  }

  async deleteExpiredMarks(): Promise<string[]> {
    const now = new Date();
    // Find expired
    const expired = await db.select({ id: marks.id }).from(marks).where(lt(marks.expiresAt, now));
    const ids = expired.map(m => m.id);

    if (ids.length > 0) {
      await db.delete(marks).where(lt(marks.expiresAt, now));
    }
    return ids;
  }

  async createSubscription(sub: InsertPushSubscription): Promise<void> {
    // Upsert or ignore if exists? endpoint is unique-ish. 
    // ID is manual UUID from frontend or backend? Schema says text PK. 
    // Let's assume we just insert. If ID conflict, we fail.
    // Better to check existence or use onConflictDoNothing if DB supports it easily.
    // For now, simple insert.
    await db.insert(pushSubscriptions).values(sub).onConflictDoNothing();
  }

  async getSubscriptions(): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions);
  }

  async deleteSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }
}

export const storage = new DatabaseStorage();
