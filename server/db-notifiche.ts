import { getDb } from "./db";
import { notifiche, alertConfig, type Notifica, type InsertNotifica, type AlertConfig, type InsertAlertConfig } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Get all notifications for a user
 */
export async function getNotificheByUserId(userId: number): Promise<Notifica[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifiche).where(eq(notifiche.userId, userId)).orderBy(desc(notifiche.createdAt));
}

/**
 * Get unread notifications count for a user
 */
export async function getUnreadNotificheCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select()
    .from(notifiche)
    .where(and(eq(notifiche.userId, userId), eq(notifiche.letta, 0)));
  return result.length;
}

/**
 * Create a new notification
 */
export async function createNotifica(data: InsertNotifica): Promise<Notifica | null> {
  const db = await getDb();
  if (!db) return null;
  const [notifica] = await db.insert(notifiche).values(data).$returningId();
  const [created] = await db.select().from(notifiche).where(eq(notifiche.id, notifica.id));
  return created;
}

/**
 * Mark notification as read
 */
export async function markNotificaAsRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifiche)
    .set({ letta: 1 })
    .where(and(eq(notifiche.id, id), eq(notifiche.userId, userId)));
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificheAsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifiche).set({ letta: 1 }).where(eq(notifiche.userId, userId));
}

/**
 * Delete a notification
 */
export async function deleteNotifica(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifiche).where(and(eq(notifiche.id, id), eq(notifiche.userId, userId)));
}

/**
 * Get all alert configurations for a user
 */
export async function getAlertConfigByUserId(userId: number): Promise<AlertConfig[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alertConfig).where(eq(alertConfig.userId, userId)).orderBy(desc(alertConfig.createdAt));
}

/**
 * Get active alert configurations for a user
 */
export async function getActiveAlertConfig(userId: number): Promise<AlertConfig[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(alertConfig)
    .where(and(eq(alertConfig.userId, userId), eq(alertConfig.attivo, 1)));
}

/**
 * Create a new alert configuration
 */
export async function createAlertConfig(data: InsertAlertConfig): Promise<AlertConfig | null> {
  const db = await getDb();
  if (!db) return null;
  const [alert] = await db.insert(alertConfig).values(data).$returningId();
  const [created] = await db.select().from(alertConfig).where(eq(alertConfig.id, alert.id));
  return created;
}

/**
 * Update an alert configuration
 */
export async function updateAlertConfig(
  id: number,
  userId: number,
  data: Partial<InsertAlertConfig>
): Promise<AlertConfig | null> {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(alertConfig)
    .set(data)
    .where(and(eq(alertConfig.id, id), eq(alertConfig.userId, userId)));
  
  const [updated] = await db
    .select()
    .from(alertConfig)
    .where(and(eq(alertConfig.id, id), eq(alertConfig.userId, userId)));
  
  return updated || null;
}

/**
 * Delete an alert configuration
 */
export async function deleteAlertConfig(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(alertConfig).where(and(eq(alertConfig.id, id), eq(alertConfig.userId, userId)));
}

/**
 * Toggle alert configuration active status
 */
export async function toggleAlertConfig(id: number, userId: number): Promise<AlertConfig | null> {
  const db = await getDb();
  if (!db) return null;
  const [current] = await db
    .select()
    .from(alertConfig)
    .where(and(eq(alertConfig.id, id), eq(alertConfig.userId, userId)));
  
  if (!current) return null;
  
  const newStatus = current.attivo === 1 ? 0 : 1;
  return updateAlertConfig(id, userId, { attivo: newStatus });
}
