/**
 * Phase 1a: schema-only seed.
 *
 * The previous seed inserted a parent + child with placeholder hashes that
 * couldn't actually log in. The real dev seed re-lands in Phase 1e once the
 * argon2id hasher + per-child PIN flow exist in the API layer.
 *
 * For now this is a no-op so `pnpm db:seed` doesn't crash.
 */
console.log('seed: phase 1a — schema only. real seed lands with Phase 1e auth endpoints.');
