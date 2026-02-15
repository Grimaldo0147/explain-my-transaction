// src/features/explain-transaction/explainTx.ts

type ExplainResult = {
  summary: string;
  txType: string;
  status?: string;
  sender?: string;
  recipient?: string;
  amount?: string;
  feeRate?: string;
  nonce?: number;
  contractId?: string;
  functionName?: string;
  memo?: string;
  blockHeight?: number;
  blockTime?: string;
  raw?: any; // optional: include minimal raw fields
};

/**
 * Build a human-friendly explanation from Hiro tx JSON.
 * This function MUST return plain JSON-serializable values (no BigInt).
 */
export function explainTransaction(tx: any): ExplainResult {
  const txType = String(tx?.tx_type || "unknown");
  const status = tx?.tx_status ? String(tx.tx_status) : undefined;

  const sender = tx?.sender_address ? String(tx.sender_address) : undefined;
  const feeRate = tx?.fee_rate ? String(tx.fee_rate) : undefined;
  const nonce =
    typeof tx?.nonce === "number" ? tx.nonce : safeNumber(tx?.nonce);

  const blockHeight =
    typeof tx?.block_height === "number"
      ? tx.block_height
      : safeNumber(tx?.block_height);

  const blockTime = tx?.block_time_iso
    ? String(tx.block_time_iso)
    : tx?.block_time
      ? String(tx.block_time)
      : undefined;

  // Token transfer
  if (txType === "token_transfer" && tx?.token_transfer) {
    const recipient = tx.token_transfer?.recipient_address
      ? String(tx.token_transfer.recipient_address)
      : undefined;

    const amount = tx.token_transfer?.amount
      ? String(tx.token_transfer.amount)
      : undefined;

    const memo = tx.token_transfer?.memo ? String(tx.token_transfer.memo) : undefined;

    return {
      summary: buildSummary({
        kind: "token_transfer",
        sender,
        recipient,
        amount,
        status,
      }),
      txType,
      status,
      sender,
      recipient,
      amount,
      feeRate,
      nonce,
      memo,
      blockHeight,
      blockTime,
      raw: pick(tx, ["tx_id", "tx_status", "tx_type"]),
    };
  }

  // Contract call
  if (txType === "contract_call" && tx?.contract_call) {
    const contractId = tx.contract_call?.contract_id
      ? String(tx.contract_call.contract_id)
      : undefined;

    const functionName = tx.contract_call?.function_name
      ? String(tx.contract_call.function_name)
      : undefined;

    return {
      summary: buildSummary({
        kind: "contract_call",
        sender,
        contractId,
        functionName,
        status,
      }),
      txType,
      status,
      sender,
      feeRate,
      nonce,
      contractId,
      functionName,
      blockHeight,
      blockTime,
      raw: pick(tx, ["tx_id", "tx_status", "tx_type"]),
    };
  }

  // Smart contract publish
  if (txType === "smart_contract" && tx?.smart_contract) {
    const contractId = tx.smart_contract?.contract_id
      ? String(tx.smart_contract.contract_id)
      : undefined;

    return {
      summary: buildSummary({
        kind: "smart_contract",
        sender,
        contractId,
        status,
      }),
      txType,
      status,
      sender,
      feeRate,
      nonce,
      contractId,
      blockHeight,
      blockTime,
      raw: pick(tx, ["tx_id", "tx_status", "tx_type"]),
    };
  }

  // Coinbase or other
  return {
    summary: buildSummary({
      kind: txType,
      sender,
      status,
    }),
    txType,
    status,
    sender,
    feeRate,
    nonce,
    blockHeight,
    blockTime,
    raw: pick(tx, ["tx_id", "tx_status", "tx_type"]),
  };
}

function safeNumber(v: any): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function pick(obj: any, keys: string[]) {
  const out: any = {};
  for (const k of keys) out[k] = obj?.[k];
  return out;
}

function buildSummary(input: {
  kind: string;
  sender?: string;
  recipient?: string;
  amount?: string;
  contractId?: string;
  functionName?: string;
  status?: string;
}) {
  const s = input.sender ? shortAddr(input.sender) : "Unknown sender";
  const st = input.status ? ` (${input.status})` : "";

  if (input.kind === "token_transfer") {
    const r = input.recipient ? shortAddr(input.recipient) : "unknown recipient";
    const a = input.amount ? input.amount : "unknown amount";
    return `${s} transferred ${a} µSTX to ${r}${st}`;
  }

  if (input.kind === "contract_call") {
    const c = input.contractId ? input.contractId : "unknown contract";
    const f = input.functionName ? input.functionName : "unknown function";
    return `${s} called ${f} on ${c}${st}`;
  }

  if (input.kind === "smart_contract") {
    const c = input.contractId ? input.contractId : "unknown contract";
    return `${s} published contract ${c}${st}`;
  }

  return `${s} submitted a ${input.kind} transaction${st}`;
}

function shortAddr(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}
