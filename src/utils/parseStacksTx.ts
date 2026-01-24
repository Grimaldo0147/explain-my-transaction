import {
  deserializeTransaction,
  TransactionVersion,
  AnchorMode,
} from '@stacks/transactions';

type ParsedTransactionSummary = {
  network: 'mainnet' | 'testnet';
  anchorMode: 'any' | 'onchain-only';
};

export function parseStacksTransaction(
  rawTxHex: string
): ParsedTransactionSummary {
  // Convert raw hex string to bytes
  const txBuffer = Buffer.from(rawTxHex, 'hex');

  // Deserialize the transaction using official Stacks tooling
  const transaction = deserializeTransaction(txBuffer);

  return {
    network:
      transaction.version === TransactionVersion.Mainnet
        ? 'mainnet'
        : 'testnet',

    anchorMode:
      transaction.anchorMode === AnchorMode.Any
        ? 'any'
        : 'onchain-only',
  };
}
