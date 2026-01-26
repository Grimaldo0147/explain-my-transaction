/**
 * Explain Transaction
 *
 * This module will convert Stacks transaction data into
 * plain-English explanations for non-technical users.
 *
 * Current scope:
 * - Accept a transaction hash
 * - Parse transaction metadata
 * - Produce a human-readable explanation
 *
 * Implementation will be added incrementally.
 */

export type TransactionExplanation = {
  txid: string;
  summary: string;
};

/**
 * Placeholder function for transaction explanation.
 * Actual logic will be implemented in future iterations.
 */
export function explainTransaction(txid: string): TransactionExplanation {
  return {
    txid,
    summary: "",
  };
}
