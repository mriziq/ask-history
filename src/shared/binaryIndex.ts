import { getAllHistoryItems, getBinaryIndex, saveBinaryIndex } from "./db";

const DIMS = 3072;
export const BYTES_PER_VEC = DIMS / 8;
const CANDIDATE_COUNT = 200;
const HIGH_BIT_MASK = 128;

// POPCOUNT[b] = number of set bits in byte b.
const POPCOUNT = new Uint8Array(256);
for (let i = 1; i < 256; i++) POPCOUNT[i] = POPCOUNT[i >> 1] + (i & 1);

export function binaryQuantize(vec: Int8Array | number[]): Uint8Array {
  const out = new Uint8Array(BYTES_PER_VEC);
  for (let i = 0; i < DIMS; i++) {
    if (vec[i] >= 0) out[i >> 3] |= (HIGH_BIT_MASK >> (i & 7));
  }
  return out;
}

// Reads BYTES_PER_VEC bytes from `data` starting at `offset`. Inline offset
// avoids allocating subarray views on the hot path.
function hammingDistance(query: Uint8Array, data: Uint8Array, offset: number): number {
  let distance = 0;
  for (let i = 0; i < BYTES_PER_VEC; i++) {
    distance += POPCOUNT[query[i] ^ data[offset + i]];
  }
  return distance;
}

export async function buildBinaryIndex(): Promise<void> {
  const items = await getAllHistoryItems();
  const embedded = items.filter((item) => item.embedding !== null);

  let totalVectors = 0;
  for (const item of embedded) {
    totalVectors += 1 + (item.chunkEmbeddings?.length ?? 0);
  }

  const urls: string[] = new Array(totalVectors);
  const visitedAts: number[] = new Array(totalVectors);
  const data = new Uint8Array(totalVectors * BYTES_PER_VEC);

  let vectorIndex = 0;
  for (const item of embedded) {
    const vectors: Int8Array[] = [item.embedding!, ...(item.chunkEmbeddings ?? [])];
    for (const vector of vectors) {
      urls[vectorIndex] = item.url;
      visitedAts[vectorIndex] = item.visitedAt;
      data.set(binaryQuantize(vector), vectorIndex * BYTES_PER_VEC);
      vectorIndex++;
    }
  }

  await saveBinaryIndex({ id: "main", urls, visitedAts, data });
}

function isWithinRange(visitedAt: number, startTime?: number, endTime?: number): boolean {
  if (startTime !== undefined && visitedAt < startTime) return false;
  if (endTime !== undefined && visitedAt > endTime) return false;
  return true;
}

// Returns up to CANDIDATE_COUNT unique URLs ranked by Hamming distance to the
// query's binary vector. Date filters applied inline so out-of-range items
// never reach the exact-rerank stage.
export async function binaryPrefilter(
  queryEmbedding: number[],
  startTime?: number,
  endTime?: number
): Promise<string[]> {
  const entry = await getBinaryIndex();
  if (!entry || entry.urls.length === 0) return [];

  const { urls, visitedAts, data } = entry;
  const queryBinary = binaryQuantize(queryEmbedding);

  type Candidate = { url: string; distance: number };
  const candidates: Candidate[] = [];

  for (let i = 0; i < urls.length; i++) {
    if (!isWithinRange(visitedAts[i], startTime, endTime)) continue;
    candidates.push({
      url: urls[i],
      distance: hammingDistance(queryBinary, data, i * BYTES_PER_VEC),
    });
  }

  candidates.sort((a, b) => a.distance - b.distance);

  // A page may appear multiple times (one vector per chunk) — keep the best.
  const seen = new Set<string>();
  const result: string[] = [];
  for (const { url } of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);
    result.push(url);
    if (result.length >= CANDIDATE_COUNT) break;
  }

  return result;
}
