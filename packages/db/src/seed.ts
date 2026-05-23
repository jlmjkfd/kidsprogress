import { v7 as uuidv7 } from 'uuid';
import { createDb } from './client.js';
import { users, children } from './schema.js';

async function main() {
  const db = createDb();
  const parentId = uuidv7();
  await db.insert(users).values({
    id: parentId,
    email: 'dev@kidsprogress.local',
    // argon2 hash of "devpassword" — placeholder, real hashing happens in apps/api
    passwordHash: '$argon2id$placeholder',
    displayName: 'Dev Parent',
    role: 'parent',
  });

  await db.insert(children).values({
    id: uuidv7(),
    parentId,
    displayName: 'Demo Child',
    birthDate: '2017-05-12',
    grade: '2',
  });

  console.log('seeded dev data: dev@kidsprogress.local + 1 child');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
