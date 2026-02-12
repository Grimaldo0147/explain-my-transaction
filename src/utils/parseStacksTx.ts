// src/utils/parseStacksTx.ts
import { deserializeTransaction } from "@stacks/transactions";

export function parseStacksTransaction(rawTxHex: string) {
  const hex = rawTxHex.replace(/^0x/, "");
  const bytes = Buffer.from(hex, "hex");
  return deserializeTransaction(bytes);
}
