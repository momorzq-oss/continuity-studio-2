const COMPRESSED_PREFIX = 'continuity-gzip-base64:';
const COMPRESSION_THRESHOLD_BYTES = 1_250_000;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function gzip(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Store large canonical project and recovery states inside D1 without crossing
 * its per-value limit. The encoded value remains database-resident; R2 is only
 * used for media, never as the authority for structured project state.
 */
export async function encodeProjectState(value: unknown) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  if (bytes.byteLength < COMPRESSION_THRESHOLD_BYTES) return json;
  return `${COMPRESSED_PREFIX}${bytesToBase64(await gzip(bytes))}`;
}

export async function decodeProjectState<T>(stored: string): Promise<T> {
  if (!stored.startsWith(COMPRESSED_PREFIX)) return JSON.parse(stored) as T;
  const compressed = base64ToBytes(stored.slice(COMPRESSED_PREFIX.length));
  const json = new TextDecoder().decode(await gunzip(compressed));
  return JSON.parse(json) as T;
}

export function isCompressedProjectState(stored: string) {
  return stored.startsWith(COMPRESSED_PREFIX);
}
