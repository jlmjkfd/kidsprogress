import { and, desc, eq, isNull } from 'drizzle-orm';
import {
  children,
  devices,
  type Database_,
  type DeviceRow,
  type NewDeviceRow,
} from '@kidsprogress/db';

export function createDevicesRepo(db: Database_) {
  return {
    async listByParent(parentId: string): Promise<DeviceRow[]> {
      return db
        .select()
        .from(devices)
        .where(eq(devices.parentId, parentId))
        .orderBy(desc(devices.createdAt));
    },
    async insert(row: NewDeviceRow): Promise<DeviceRow> {
      const [inserted] = await db.insert(devices).values(row).returning();
      if (!inserted) throw new Error('failed to insert device');
      return inserted;
    },
    async findActiveByTokenHash(tokenHash: string): Promise<DeviceRow | undefined> {
      const rows = await db
        .select()
        .from(devices)
        .where(and(eq(devices.tokenHash, tokenHash), isNull(devices.revokedAt)))
        .limit(1);
      return rows[0];
    },
    async touchLastSeen(id: string): Promise<void> {
      await db.update(devices).set({ lastSeenAt: new Date().toISOString() }).where(eq(devices.id, id));
    },
    async revoke(id: string, parentId: string): Promise<boolean> {
      const result = await db
        .update(devices)
        .set({ revokedAt: new Date().toISOString() })
        .where(and(eq(devices.id, id), eq(devices.parentId, parentId)))
        .returning({ id: devices.id });
      return result.length > 0;
    },
    /** Sanity check that the parent owns the child they're binding the device to. */
    async parentOwnsChild(parentId: string, childId: string): Promise<boolean> {
      const rows = await db
        .select({ id: children.id })
        .from(children)
        .where(and(eq(children.id, childId), eq(children.parentId, parentId)))
        .limit(1);
      return rows.length > 0;
    },
  };
}

export type DevicesRepo = ReturnType<typeof createDevicesRepo>;
