import { parseStacksTransaction } from "@/utils/parseStacksTx";

type ExplainResult = {
  summary: string;
  details: {
    anchorMode?: string;
    txType?: string;
    fee?: string;
    nonce?: string;
  };
  parsedTx: unknown;
};

function safeToString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return String(value);
}

export function explainTransaction(rawTxHex: string): ExplainResult {
  const parsedTx: any = parseStacksTransaction(rawTxHex);

  // NOTE:
  // The parsed Stacks transaction object does NOT include a `network` property.
  // Network should be inferred by your app (mainnet/testnet) based on context.
  const anchorMode = safeToString(parsedTx?.anchorMode);
  const txType = safeToString(parsedTx?.payload?.payloadType ?? parsedTx?.payload?.type);
  const fee = safeToString(parsedTx?.auth?.spendingCondition?.fee);
  const nonce = safeToString(parsedTx?.auth?.spendingCondition?.nonce);

  const summaryParts: string[] = ["Parsed a Stacks transaction."];
  if (txType) summaryParts.push(`Type: ${txType}.`);
  if (anchorMode) summaryParts.push(`Anchoring: ${anchorMode}.`);

  return {
    summary: summaryParts.join(" "),
    details: {
      anchorMode,
      txType,
      fee,
      nonce,
    },
    parsedTx,
  };
}
