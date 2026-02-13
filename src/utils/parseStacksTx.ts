// src/utils/parseStacksTx.ts
import { deserializeTransaction } from "@stacks/transactions";

/**
 * Parses a Stacks raw transaction hex string into a StacksTransaction object.
 * Safe for server/API usage (uses Node Buffer).
 */
export function parseStacksTransaction(rawTxHex: string) {
  const hex = (rawTxHex || "")
    .trim()
    .replace(/^0x/i, "")
    .replace(/\s+/g, "");

  if (!hex) throw new Error("Empty transaction hex");
  if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error("Invalid hex string");
  if (hex.length % 2 !== 0) throw new Error("Hex string must have even length");

  const bytes = Uint8Array.from(Buffer.from(hex, "hex"));
  return deserializeTransaction(bytes);
}

/**
 * Backwards-compatible alias (some files may import parseStacksTx).
 */
export const parseStacksTx = parseStacksTransaction;
