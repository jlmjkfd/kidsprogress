import { createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { resolveFromRepoRoot } from '@kidsprogress/db';
import type { AttachmentKind } from '@kidsprogress/shared';

/**
 * Tiny upload-store abstraction. Phase 3 wires `local` only (NAS volume).
 * S3-compatible (R2) implementation is the future cloud-portable path —
 * same interface, ~50 lines of swap. (See plan §3.1.)
 */
export interface UploadStore {
  /** Save a stream to disk, returning the relative storage path. */
  save(input: {
    readable: NodeJS.ReadableStream;
    id: string;
    originalFilename?: string | undefined;
  }): Promise<{ storagePath: string; sizeBytes: number }>;
  delete(storagePath: string): Promise<void>;
  /** Absolute filesystem path for serving. */
  resolveAbsolute(storagePath: string): string;
}

export function createLocalUploadStore(opts: { rootPath: string }): UploadStore {
  const root = isAbsolute(opts.rootPath) ? opts.rootPath : resolveFromRepoRoot(opts.rootPath);

  return {
    async save({ readable, id }) {
      const dir = join(root, id.slice(0, 2));
      await mkdir(dir, { recursive: true });
      const storagePath = join(dir.replace(root + '\\', '').replace(root + '/', ''), id);
      const abs = resolve(root, storagePath);
      await mkdir(dirname(abs), { recursive: true });
      await pipeline(readable, createWriteStream(abs));
      const st = await stat(abs);
      return { storagePath: storagePath.split('\\').join('/'), sizeBytes: st.size };
    },
    async delete(storagePath) {
      try {
        await unlink(resolve(root, storagePath));
      } catch {
        // already gone
      }
    },
    resolveAbsolute(storagePath) {
      return resolve(root, storagePath);
    },
  };
}

// ── MIME allowlist + magic-byte verification ─────────────────────────────
// Audit fix #16: never trust client-declared MIME. Verify the first few bytes
// against a small allowlist before persisting.
type MimeRule = { mime: string; kind: AttachmentKind; matchers: Array<{ offset: number; bytes: number[] }> };

const RULES: MimeRule[] = [
  // JPEG: FF D8 FF
  { mime: 'image/jpeg', kind: 'image', matchers: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }] },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  {
    mime: 'image/png',
    kind: 'image',
    matchers: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  },
  // WebP: RIFF....WEBP
  {
    mime: 'image/webp',
    kind: 'image',
    matchers: [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // "WEBP"
    ],
  },
  // PDF: %PDF
  { mime: 'application/pdf', kind: 'document', matchers: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }] },
  // MP4 / M4A share an ftyp box at offset 4
  { mime: 'audio/m4a', kind: 'audio', matchers: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }] },
  { mime: 'video/mp4', kind: 'video', matchers: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }] },
];

export interface SniffResult {
  ok: true;
  mime: string;
  kind: AttachmentKind;
}
export interface SniffFail {
  ok: false;
  reason: 'unknown' | 'mismatch';
}

/**
 * Match the first ~16 bytes of an upload against the allowlist. The client
 * also declares a MIME (multipart Content-Type); we require it to match the
 * detected type so attackers can't claim a PNG that's actually an EXE.
 */
export function sniffAndMatch(head: Buffer, declaredMime: string): SniffResult | SniffFail {
  for (const rule of RULES) {
    const ok = rule.matchers.every((m) =>
      m.bytes.every((b, i) => head.at(m.offset + i) === b),
    );
    if (ok) {
      if (declaredMime !== rule.mime) return { ok: false, reason: 'mismatch' };
      return { ok: true, mime: rule.mime, kind: rule.kind };
    }
  }
  return { ok: false, reason: 'unknown' };
}
