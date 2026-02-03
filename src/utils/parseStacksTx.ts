// src/utils/parseStacksTx.ts
import { deserializeTransaction } from "@stacks/transactions";

export function parseStacksTransaction(rawTxHex: string) {
  // rawTxHex should be hex string without 0x prefix
  const bytes = Buffer.from(rawTxHex.replace(/^0x/, ""), "hex");
  return deserializeTransaction(bytes);
}
