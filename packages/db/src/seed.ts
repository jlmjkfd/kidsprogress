/**
 * Dev seed. Inserts a working family so a freshly-cloned checkout can be
 * driven end-to-end without curl / signup forms:
 *
 *   - parent : seed@kidsprogress.local / seed-password-12345
 *   - children: Mia (no PIN), Liam (PIN 4242)
 *   - templates: 1 generic, 1 math (addition / no carry), 1 reading log
 *   - assignments: each child gets the math template for the next 7 days
 *   - device: "Living-room iPad" — the deviceToken is printed to stdout
 *
 * Idempotent: if `seed@kidsprogress.local` already exists, the script
 * exits with a friendly message rather than crashing on the unique-email
 * constraint. Drop `./data/kidsprogress.sqlite` to start fresh.
 */
import argon2 from 'argon2';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { createDb } from './client.js';
import {
  children,
  deviceChildren,
  devices,
  taskAssignments,
  taskTemplates,
  users,
} from './schema.js';

const SEED_EMAIL = 'seed@kidsprogress.local';
const SEED_PASSWORD = 'seed-password-12345';
const SEED_DISPLAY = 'Seed Parent';

async function main() {
  const db = createDb();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, SEED_EMAIL))
    .limit(1);
  if (existing[0]) {
    console.log(`seed: ${SEED_EMAIL} already exists. Skipping.`);
    console.log(`seed: password = ${SEED_PASSWORD}`);
    console.log('seed: drop ./data/kidsprogress.sqlite to start fresh.');
    return;
  }

  const argonOpts = {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  } as const;
  const passwordHash = await argon2.hash(SEED_PASSWORD, argonOpts);

  // ── parent ────────────────────────────────────────────────────────────
  const parentId = uuidv7();
  const familyId = parentId;
  await db.insert(users).values({
    id: parentId,
    familyId,
    email: SEED_EMAIL,
    passwordHash,
    displayName: SEED_DISPLAY,
    locale: 'en',
  });

  // ── children ──────────────────────────────────────────────────────────
  const miaId = uuidv7();
  const liamId = uuidv7();
  const liamPinHash = await argon2.hash('4242', argonOpts);
  await db.insert(children).values([
    {
      id: miaId,
      familyId,
      displayName: 'Mia',
      avatarKey: 'avatar-03',
      birthYear: 2019,
    },
    {
      id: liamId,
      familyId,
      displayName: 'Liam',
      avatarKey: 'avatar-07',
      birthYear: 2014,
      pinRequired: true,
      pinHash: liamPinHash,
    },
  ]);

  // ── templates ────────────────────────────────────────────────────────
  const tplGenericId = uuidv7();
  const tplMathId = uuidv7();
  const tplReadingId = uuidv7();
  await db.insert(taskTemplates).values([
    {
      id: tplGenericId,
      parentId,
      handlerId: 'generic',
      schemaVersion: 1,
      name: 'Tidy up the desk',
      config: {
        steps: [
          { id: 'a', label: 'Put away pencils' },
          { id: 'b', label: 'Wipe the surface' },
        ],
        instructions: 'Five minutes, no more.',
      },
      tags: ['chore'],
    },
    {
      id: tplMathId,
      parentId,
      handlerId: 'addition-subtraction',
      schemaVersion: 1,
      name: 'Daily math drill',
      config: {
        maxValue: 9,
        operations: ['addition'],
        allowCarry: false,
        minResult: 0,
        questionsPerSlot: 5,
        requiredSlots: 1,
      },
      tags: ['math'],
    },
    {
      id: tplReadingId,
      parentId,
      handlerId: 'reading-log',
      schemaVersion: 1,
      name: 'Reading time',
      config: { minMinutes: 15, requireSummary: false },
      tags: ['reading'],
    },
  ]);

  // ── assignments ──────────────────────────────────────────────────────
  // Math template assigned to both kids, daily for 7 days starting today.
  const today = new Date();
  today.setHours(8, 0, 0, 0);
  const effectiveFrom = today.toISOString();

  for (const childId of [miaId, liamId]) {
    await db.insert(taskAssignments).values({
      id: uuidv7(),
      templateId: tplMathId,
      childId,
      parentId,
      rrule: 'FREQ=DAILY;COUNT=7',
      timezone: 'Asia/Shanghai',
      effectiveFrom,
      schedulingType: 'flexible',
      obligation: 'required',
    });
  }

  // ── device ───────────────────────────────────────────────────────────
  const deviceToken = randomBytes(48).toString('base64url');
  const tokenHash = createHash('sha256').update(deviceToken).digest('hex');
  const deviceId = uuidv7();
  await db.insert(devices).values({
    id: deviceId,
    familyId,
    tokenHash,
    label: 'Living-room iPad (seed)',
  });
  await db.insert(deviceChildren).values([
    { deviceId, childId: miaId },
    { deviceId, childId: liamId },
  ]);

  // Random touch so we can confirm this seed produced fresh randomness.
  void randomInt(0, 1);

  console.log('seed: family inserted.');
  console.log('────────────────────────────────────────────────────────');
  console.log(`  parent email   : ${SEED_EMAIL}`);
  console.log(`  parent password: ${SEED_PASSWORD}`);
  console.log('');
  console.log(`  child   "Mia"  : no PIN`);
  console.log(`  child   "Liam" : PIN 4242`);
  console.log('');
  console.log(`  device token   : ${deviceToken}`);
  console.log('');
  console.log('  Paste the device token on the kid portal setup screen.');
  console.log('  Sign in at /parent-login with the credentials above.');
  console.log('────────────────────────────────────────────────────────');
}

await main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
