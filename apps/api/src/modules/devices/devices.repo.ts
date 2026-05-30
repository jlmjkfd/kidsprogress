import { and, eq } from 'drizzle-orm';
import {
  deviceChildren,
  devices,
  type Database_,
  type DeviceChildRow,
  type DeviceRow,
  type NewDeviceChildRow,
  type NewDeviceRow,
} from '@kidsprogress/db';

export function createDevicesRepo(db: Database_) {
  return {
    async listByFamily(familyId: string): Promise<DeviceRow[]> {
      return db.select().from(devices).where(eq(devices.familyId, familyId));
    },

    async findById(id: string): Promise<DeviceRow | undefined> {
      const rows = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
      return rows[0];
    },

    async findByIdInFamily(id: string, familyId: string): Promise<DeviceRow | undefined> {
      const rows = await db
        .select()
        .from(devices)
        .where(and(eq(devices.id, id), eq(devices.familyId, familyId)))
        .limit(1);
      return rows[0];
    },

    async findByTokenHash(tokenHash: string): Promise<DeviceRow | undefined> {
      const rows = await db
        .select()
        .from(devices)
        .where(eq(devices.tokenHash, tokenHash))
        .limit(1);
      return rows[0];
    },

    async insertDevice(row: NewDeviceRow): Promise<DeviceRow> {
      const [inserted] = await db.insert(devices).values(row).returning();
      if (!inserted) throw new Error('failed to insert device');
      return inserted;
    },

    async markRevoked(id: string): Promise<void> {
      await db
        .update(devices)
        .set({ revokedAt: new Date().toISOString() })
        .where(eq(devices.id, id));
    },

    async touchLastUsed(id: string): Promise<void> {
      await db
        .update(devices)
        .set({ lastUsedAt: new Date().toISOString() })
        .where(eq(devices.id, id));
    },

    async listChildrenForDevice(deviceId: string): Promise<DeviceChildRow[]> {
      return db
        .select()
        .from(deviceChildren)
        .where(eq(deviceChildren.deviceId, deviceId));
    },

    async attachChild(row: NewDeviceChildRow): Promise<void> {
      // INSERT OR IGNORE — attaching twice is a no-op, not an error.
      await db.insert(deviceChildren).values(row).onConflictDoNothing();
    },

    async detachChild(deviceId: string, childId: string): Promise<void> {
      await db
        .delete(deviceChildren)
        .where(
          and(eq(deviceChildren.deviceId, deviceId), eq(deviceChildren.childId, childId)),
        );
    },

    async isChildAttached(deviceId: string, childId: string): Promise<boolean> {
      const rows = await db
        .select()
        .from(deviceChildren)
        .where(
          and(eq(deviceChildren.deviceId, deviceId), eq(deviceChildren.childId, childId)),
        )
        .limit(1);
      return rows.length > 0;
    },
  };
}

export type DevicesRepo = ReturnType<typeof createDevicesRepo>;
