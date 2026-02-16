// src/features/explain-transaction/explainTx.ts

type ExplainResult = {
  summary: string;
  shortSummary: string;
  txType: string;
  txId?: string;
  status?: string;
  sender?: string;
  recipient?: string;
  amount?: string;
  amountFormatted?: string;
  feeRate?: string;
  feeFormatted?: string;
  nonce?: number;
  contractId?: string;
  functionName?: string;
  functionArgs?: string[];
  memo?: string;
  blockHeight?: number;
  blockTime?: string;
  confirmations?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  warnings?: string[];
  tags?: string[];
  decodedData?: Record<string, any>;
  raw?: any;
};

/**
 * Build a human-friendly explanation from Hiro tx JSON.
 * This function MUST return plain JSON-serializable values (no BigInt).
 */
export function explainTransaction(tx: any): ExplainResult {
  const txType = String(tx?.tx_type || "unknown");
  const txId = tx?.tx_id ? String(tx.tx_id) : undefined;
  const status = tx?.tx_status ? String(tx.tx_status) : undefined;
  const sender = tx?.sender_address ? String(tx.sender_address) : undefined;
  const feeRate = tx?.fee_rate ? String(tx.fee_rate) : undefined;
  const feeFormatted = feeRate ? formatMicroStx(feeRate) : undefined;
  const nonce = typeof tx?.nonce === "number" ? tx.nonce : safeNumber(tx?.nonce);
  const blockHeight = typeof tx?.block_height === "number" ? tx.block_height : safeNumber(tx?.block_height);
  const blockTime = tx?.block_time_iso ? String(tx.block_time_iso) : tx?.block_time ? String(tx.block_time) : undefined;
  
  // Calculate confirmations if block height is available
  const currentBlockHeight = 1000; // This should come from your blockchain context
  const confirmations = blockHeight ? Math.max(0, currentBlockHeight - blockHeight) : undefined;

  // Extract function arguments if available
  const functionArgs = tx?.contract_call?.function_args?.map((arg: any) => 
    arg?.repr ? String(arg.repr) : JSON.stringify(arg)
  );

  // Determine risk level based on transaction characteristics
  const riskLevel = determineRiskLevel(tx, txType, status);
  const warnings = generateWarnings(tx, riskLevel);
  const tags = generateTags(tx, txType);

  // Token transfer
  if (txType === "token_transfer" && tx?.token_transfer) {
    const recipient = tx.token_transfer?.recipient_address
      ? String(tx.token_transfer.recipient_address)
      : undefined;

    const amount = tx.token_transfer?.amount
      ? String(tx.token_transfer.amount)
      : undefined;

    const amountFormatted = amount ? formatMicroStx(amount) : undefined;
    const memo = tx.token_transfer?.memo ? String(tx.token_transfer.memo) : undefined;

    // Decode memo if it's hex or base64
    const decodedMemo = memo ? decodeMemo(memo) : undefined;

    return {
      summary: buildSummary({
        kind: "token_transfer",
        sender,
        recipient,
        amount,
        status,
        decodedMemo,
      }),
      shortSummary: buildShortSummary("token_transfer", amount, recipient),
      txType,
      txId,
      status,
      sender,
      recipient,
      amount,
      amountFormatted,
      feeRate,
      feeFormatted,
      nonce,
      memo,
      decodedData: decodedMemo ? { memo: decodedMemo } : undefined,
      blockHeight,
      blockTime,
      confirmations,
      riskLevel,
      warnings,
      tags,
      raw: pick(tx, ["tx_id", "tx_status", "tx_type", "fee_rate", "nonce"]),
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

    // Try to decode function arguments based on known ABIs
    const decodedArgs = functionArgs ? decodeFunctionArgs(contractId, functionName, functionArgs) : undefined;

    return {
      summary: buildSummary({
        kind: "contract_call",
        sender,
        contractId,
        functionName,
        functionArgs: functionArgs?.join(', '),
        status,
      }),
      shortSummary: buildShortSummary("contract_call", functionName, contractId),
      txType,
      txId,
      status,
      sender,
      feeRate,
      feeFormatted,
      nonce,
      contractId,
      functionName,
      functionArgs,
      decodedData: decodedArgs,
      blockHeight,
      blockTime,
      confirmations,
      riskLevel,
      warnings,
      tags,
      raw: pick(tx, ["tx_id", "tx_status", "tx_type", "fee_rate", "nonce"]),
    };
  }

  // Smart contract publish
  if (txType === "smart_contract" && tx?.smart_contract) {
    const contractId = tx.smart_contract?.contract_id
      ? String(tx.smart_contract.contract_id)
      : undefined;

    const contractSource = tx.smart_contract?.source_code
      ? String(tx.smart_contract.source_code)
      : undefined;

    // Extract contract name from source or contractId
    const contractName = extractContractName(contractId, contractSource);

    return {
      summary: buildSummary({
        kind: "smart_contract",
        sender,
        contractId,
        contractName,
        status,
      }),
      shortSummary: buildShortSummary("smart_contract", contractName, contractId),
      txType,
      txId,
      status,
      sender,
      feeRate,
      feeFormatted,
      nonce,
      contractId,
      decodedData: { contractName, sourceLength: contractSource?.length },
      blockHeight,
      blockTime,
      confirmations,
      riskLevel,
      warnings,
      tags,
      raw: pick(tx, ["tx_id", "tx_status", "tx_type", "fee_rate", "nonce"]),
    };
  }

  // Coinbase or other
  return {
    summary: buildSummary({
      kind: txType,
      sender,
      status,
    }),
    shortSummary: buildShortSummary(txType),
    txType,
    txId,
    status,
    sender,
    feeRate,
    feeFormatted,
    nonce,
    blockHeight,
    blockTime,
    confirmations,
    riskLevel,
    warnings,
    tags,
    raw: pick(tx, ["tx_id", "tx_status", "tx_type", "fee_rate", "nonce"]),
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
  functionArgs?: string;
  contractName?: string;
  decodedMemo?: string;
  status?: string;
}) {
  const s = input.sender ? shortAddr(input.sender) : "Unknown sender";
  const st = input.status ? ` (${input.status})` : "";

  if (input.kind === "token_transfer") {
    const r = input.recipient ? shortAddr(input.recipient) : "unknown recipient";
    const a = input.amount ? formatMicroStxWithUnit(input.amount) : "unknown amount";
    const memoNote = input.decodedMemo ? ` with memo: "${input.decodedMemo}"` : "";
    return `${s} transferred ${a} to ${r}${memoNote}${st}`;
  }

  if (input.kind === "contract_call") {
    const c = input.contractId ? formatContractId(input.contractId) : "unknown contract";
    const f = input.functionName ? input.functionName : "unknown function";
    const args = input.functionArgs ? ` with args (${input.functionArgs})` : "";
    return `${s} called ${f} on ${c}${args}${st}`;
  }

  if (input.kind === "smart_contract") {
    const c = input.contractName || (input.contractId ? formatContractId(input.contractId) : "unknown contract");
    return `${s} published contract ${c}${st}`;
  }

  return `${s} submitted a ${input.kind} transaction${st}`;
}

function buildShortSummary(kind: string, param1?: string, param2?: string): string {
  switch (kind) {
    case "token_transfer":
      return `Send ${param1 || '?'} STX`;
    case "contract_call":
      return `Call ${param1 || '?'}`;
    case "smart_contract":
      return `Deploy ${param1 || 'contract'}`;
    default:
      return kind.replace(/_/g, ' ');
  }
}

function shortAddr(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function formatMicroStx(amount: string): string {
  const microStx = Number(amount);
  if (isNaN(microStx)) return amount;
  return (microStx / 1_000_000).toFixed(6);
}

function formatMicroStxWithUnit(amount: string): string {
  const stx = formatMicroStx(amount);
  return `${stx} STX`;
}

function formatContractId(contractId: string): string {
  const parts = contractId.split('.');
  if (parts.length === 2) {
    return `${shortAddr(parts[0])}.${parts[1]}`;
  }
  return contractId;
}

function decodeMemo(memo: string): string | undefined {
  // Try to decode hex
  if (/^[0-9a-fA-F]+$/.test(memo)) {
    try {
      // This is simplified - in reality you'd need proper hex decoding
      return memo;
    } catch {
      // Fall through
    }
  }
  
  // Try base64
  if (/^[A-Za-z0-9+/=]+$/.test(memo)) {
    try {
      // This is simplified - in reality you'd need proper base64 decoding
      return memo;
    } catch {
      // Fall through
    }
  }
  
  return memo.length > 0 ? memo : undefined;
}

function decodeFunctionArgs(contractId?: string, functionName?: string, args?: string[]): Record<string, any> | undefined {
  if (!contractId || !functionName || !args) return undefined;
  
  // This would ideally use a registry of known contract ABIs
  // For now, return a simple mapping
  return {
    function: functionName,
    arguments: args,
    count: args.length
  };
}

function extractContractName(contractId?: string, source?: string): string | undefined {
  if (contractId) {
    const parts = contractId.split('.');
    if (parts.length === 2) {
      return parts[1];
    }
  }
  
  // Try to extract from source (simplified)
  if (source) {
    const match = source.match(/define-contract\s+(\w+)/);
    if (match) return match[1];
  }
  
  return undefined;
}

function determineRiskLevel(tx: any, txType: string, status?: string): 'low' | 'medium' | 'high' | 'critical' {
  // Failed transactions are higher risk
  if (status === 'failed' || status === 'abort_by_response' || status === 'abort_by_post_condition') {
    return 'critical';
  }
  
  // Contract calls to unknown contracts are higher risk
  if (txType === 'contract_call' && tx?.contract_call) {
    const contractId = tx.contract_call.contract_id;
    // This would ideally check against a known contract registry
    // For now, assume new contracts are higher risk
    if (contractId?.includes('unknown') || contractId?.includes('new')) {
      return 'high';
    }
  }
  
  // Large transfers are medium risk
  if (txType === 'token_transfer' && tx?.token_transfer) {
    const amount = Number(tx.token_transfer.amount);
    if (amount > 1_000_000_000_000) { // > 1M STX
      return 'high';
    }
    if (amount > 100_000_000_000) { // > 100K STX
      return 'medium';
    }
  }
  
  return 'low';
}

function generateWarnings(tx: any, riskLevel: string): string[] {
  const warnings: string[] = [];
  
  if (riskLevel === 'critical') {
    warnings.push('This transaction failed - review for errors');
  }
  
  if (riskLevel === 'high') {
    warnings.push('This transaction involves a large amount or unknown contract - verify carefully');
  }
  
  // Check for unusual fee rates
  const feeRate = Number(tx?.fee_rate);
  if (feeRate > 1000) {
    warnings.push('Higher than average fee rate');
  }
  
  // Check for contract calls with no args (might be suspicious)
  if (tx?.tx_type === 'contract_call' && 
      (!tx?.contract_call?.function_args || tx.contract_call.function_args.length === 0)) {
    warnings.push('Contract call with no arguments - verify intent');
  }
  
  return warnings;
}

function generateTags(tx: any, txType: string): string[] {
  const tags: string[] = [];
  
  // Add type tag
  tags.push(txType.replace(/_/g, '-'));
  
  // Add status tag
  if (tx?.tx_status) {
    tags.push(`status:${tx.tx_status}`);
  }
  
  // Add tags for specific contract interactions
  if (txType === 'contract_call' && tx?.contract_call) {
    const contractId = tx.contract_call.contract_id;
    if (contractId?.includes('bns')) tags.push('bns');
    if (contractId?.includes('nft')) tags.push('nft');
    if (contractId?.includes('swap')) tags.push('defi');
    if (contractId?.includes('vault')) tags.push('vault');
  }
  
  // Add time-based tags
  if (tx?.block_time) {
    const txTime = new Date(tx.block_time).getHours();
    if (txTime >= 0 && txTime < 6) tags.push('night-tx');
  }
  
  return tags;
}

// Export additional utility functions for external use
export const utils = {
  formatMicroStx,
  formatMicroStxWithUnit,
  shortAddr,
  formatContractId,
  determineRiskLevel,
};
