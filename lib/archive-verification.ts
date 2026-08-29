import { strToU8, unzipSync, zipSync } from 'fflate';

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return toHex(await crypto.subtle.digest('SHA-256', copy.buffer));
}

export async function createVerifiedArchive(files: Record<string, Uint8Array>, manifestPath: string) {
  const expected = await Promise.all(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(async ([path, bytes]) => ({ path, bytes: bytes.byteLength, sha256: await sha256(bytes) })));
  const manifest = {
    format: 'Continuity Studio verified archive manifest',
    verificationAlgorithm: 'SHA-256',
    expectedFileCount: expected.length,
    files: expected,
  };
  const manifestBytes = strToU8(JSON.stringify(manifest, null, 2));
  const archiveFiles = { ...files, [manifestPath]: manifestBytes };
  const zipped = zipSync(archiveFiles, { level: 6 });
  const restored = unzipSync(zipped);
  const errors: string[] = [];
  for (const entry of expected) {
    const restoredBytes = restored[entry.path];
    if (!restoredBytes) errors.push(`Missing ${entry.path}`);
    else if (restoredBytes.byteLength !== entry.bytes || await sha256(restoredBytes) !== entry.sha256) errors.push(`Checksum mismatch ${entry.path}`);
  }
  if (!restored[manifestPath]) errors.push(`Missing ${manifestPath}`);
  if (Object.keys(restored).length !== expected.length + 1) errors.push('Archive contains an unexpected file count.');
  return {
    zipped,
    verification: {
      expectedFileCount: expected.length + 1,
      verifiedFileCount: errors.length ? expected.length + 1 - errors.length : expected.length + 1,
      status: errors.length ? 'Failed' as const : 'Passed' as const,
      manifestHash: await sha256(manifestBytes),
      errors,
    },
  };
}
