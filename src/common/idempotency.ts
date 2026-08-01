import { createHash } from "node:crypto";

const HASH_ALGORITHM = "sha256";
const PART_SEPARATOR = "|";

export type IdempotencyHashPart =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>;

function sortKeysDeeply(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeeply);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const source = value as Record<string, unknown>;

  return Object.fromEntries(
    Object.keys(source)
      .sort()
      .map((key) => [key, sortKeysDeeply(source[key])]),
  );
}

function normalizePart(part: IdempotencyHashPart): string {
  if (part === null || part === undefined) {
    return "";
  }

  if (typeof part === "object") {
    return JSON.stringify(sortKeysDeeply(part));
  }

  return String(part).trim();
}

export function buildIdempotencyHash(
  ...parts: IdempotencyHashPart[]
): string {
  const payload = parts.map(normalizePart).join(PART_SEPARATOR);

  return createHash(HASH_ALGORITHM).update(payload).digest("hex");
}
