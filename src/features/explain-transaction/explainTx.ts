import { parseStacksTransaction } from '@/utils/parseStacksTx';

export function explainTransaction(rawTxHex: string) {
  const parsedTx = parseStacksTransaction(rawTxHex);

  return {
    summary: `This transaction ran on ${parsedTx.network} with ${parsedTx.anchorMode} anchoring.`,
    parsedTx,
  };
}
