// src/utils/parseStacksTx.ts
// Parses Hiro "extended/v1/tx/:txid" response into a UI-friendly shape.
// IMPORTANT: This file MUST export `parseStacksTransaction` (named export)
// because your route.ts imports it.

export type Network = "mainnet" | "testnet";

export type ParsedEvent =
  | {
      kind: "stx_transfer";
      amountMicroStx: string;
      sender?: string;
      recipient?: string;
      memo?: string;
      asset?: "STX";
    }
  | {
      kind: "ft_transfer";
      asset: string; // contract asset identifier when available
      amount: string;
      sender?: string;
      recipient?: string;
    }
  | {
      kind: "nft_transfer";
      asset: string;
      sender?: string;
      recipient?: string;
      tokenId?: string;
    }
  | {
      kind: "contract_call";
      contractId: string;
      functionName: string;
    }
  | {
      kind: "other";
      label: string;
      raw?: any;
    };

export type ParsedStacksTx = {
  network: Network;
  txid: string; // 0x...
  status?: string; // success / pending / abort_by_response etc
  type?: string; // token_transfer, contract_call, smart_contract, coinbase, ...
  sender?: string;
  recipientOrTarget?: string; // recipient OR contract target
  contractId?: string;
  functionName?: string;
  memo?: string;

  // Amounts
  feeMicroStx?: string;
  feeStx?: string;
  amountMicroStx?: string;
  amountStx?: string;

  // Block/time
  blockHeight?: number;
  timestamp?: string; // ISO
  canonical?: boolean;

  // Events
  events: ParsedEvent[];

  // Keep raw for Debug
  raw: any;
};

/**
 * Extracts 0x + 64 hex txid from:
 * - raw txid
 * - txid without 0x
 * - explorer links (Hiro, etc)
 */
export function normalizeStacksTxid(input: string): string {
  const raw = (input || "").trim();

  // direct txid
  const direct = raw.startsWith("0x") ? raw : raw.length === 64 ? `0x${raw}` : "";
  if (direct && /^[0-9a-fA-F]{66}$/.test(direct)) return direct.toLowerCase();

  // find inside link/text
  const match = raw.match(/(0x)?[0-9a-fA-F]{64}/);
  if (!match?.[0]) return "";

  const found = match[0].startsWith("0x") ? match[0] : `0x${match[0]}`;
  return found.toLowerCase();
}

function toBigIntSafe(v: any): bigint | null {
  try {
    if (v === null || v === undefined) return null;
    if (typeof v === "bigint") return v;
    if (typeof v === "number") return BigInt(Math.floor(v));
    if (typeof v === "string" && v.trim() !== "") return BigInt(v);
    return null;
  } catch {
    return null;
  }
}

function microToStxString(micro: string | undefined): string | undefined {
  if (!micro) return undefined;
  try {
    const n = BigInt(micro);
    const sign = n < 0n ? "-" : "";
    const abs = n < 0n ? -n : n;
    const whole = abs / 1_000_000n;
    const frac = abs % 1_000_000n;
    const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
    return fracStr.length ? `${sign}${whole.toString()}.${fracStr}` : `${sign}${whole.toString()}`;
  } catch {
    return undefined;
  }
}

function guessFeeMicro(tx: any): string | undefined {
  // Hiro commonly has fee_rate + tx_size. Some payloads may have fee directly.
  // We try multiple paths safely.
  const feeDirect =
    toBigIntSafe(tx?.fee) ??
    toBigIntSafe(tx?.tx?.fee) ??
    toBigIntSafe(tx?.fee_micro_stx);

  if (feeDirect !== null) return feeDirect.toString();

  const feeRate = toBigIntSafe(tx?.fee_rate) ?? toBigIntSafe(tx?.tx?.fee_rate);
  const txSize = toBigIntSafe(tx?.tx_size) ?? toBigIntSafe(tx?.tx?.tx_size);

  if (feeRate !== null && txSize !== null) return (feeRate * txSize).toString();

  return undefined;
}

function parsePrimaryFields(tx: any) {
  const sender =
    tx?.sender_address ||
    tx?.sender ||
    tx?.origin_address ||
    tx?.tx?.sender_address ||
    tx?.tx?.sender;

  const type =
    tx?.tx_type ||
    tx?.type ||
    tx?.tx?.tx_type ||
    tx?.tx?.type;

  const status =
    tx?.tx_status ||
    tx?.status ||
    tx?.tx?.tx_status;

  const blockHeight =
    typeof tx?.block_height === "number"
      ? tx.block_height
      : typeof tx?.tx?.block_height === "number"
      ? tx.tx.block_height
      : undefined;

  const canonical =
    typeof tx?.canonical === "boolean"
      ? tx.canonical
      : typeof tx?.tx?.canonical === "boolean"
      ? tx.tx.canonical
      : undefined;

  // timestamp can appear as burn_block_time_iso or block_time_iso depending on endpoint
  const timestamp =
    tx?.burn_block_time_iso ||
    tx?.block_time_iso ||
    tx?.tx?.burn_block_time_iso ||
    tx?.tx?.block_time_iso;

  const txidRaw =
    tx?.tx_id ||
    tx?.txid ||
    tx?.tx?.tx_id ||
    tx?.tx?.txid;

  const txid = normalizeStacksTxid(txidRaw || "");

  return { sender, type, status, blockHeight, canonical, timestamp, txid };
}

function parseRecipientAndContract(tx: any): {
  recipientOrTarget?: string;
  contractId?: string;
  functionName?: string;
  memo?: string;
  amountMicroStx?: string;
} {
  // token transfer
  if (tx?.token_transfer) {
    return {
      recipientOrTarget: tx.token_transfer?.recipient_address,
      memo: tx.token_transfer?.memo,
      amountMicroStx: tx.token_transfer?.amount,
    };
  }

  // contract call
  if (tx?.contract_call) {
    const contractId = tx.contract_call?.contract_id;
    const functionName = tx.contract_call?.function_name;
    return {
      recipientOrTarget: contractId,
      contractId,
      functionName,
    };
  }

  // smart contract deploy
  if (tx?.smart_contract) {
    const contractId = tx.smart_contract?.contract_id;
    return {
      recipientOrTarget: contractId,
      contractId,
    };
  }

  // fallback common fields
  const recipient =
    tx?.recipient_address ||
    tx?.recipient ||
    tx?.tx?.recipient_address ||
    tx?.tx?.recipient;

  return { recipientOrTarget: recipient };
}

function parseEvents(tx: any): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Hiro tx endpoint may include `events` array
  const rawEvents: any[] = Array.isArray(tx?.events)
    ? tx.events
    : Array.isArray(tx?.tx?.events)
    ? tx.tx.events
    : [];

  for (const e of rawEvents) {
    // Try to support common event shapes. If unknown, store as "other".
    const et = e?.event_type || e?.type;

    // STX transfer event (sometimes under "stx_transfer_event")
    if (et === "stx_transfer_event" || e?.stx_transfer_event) {
      const se = e?.stx_transfer_event || e;
      events.push({
        kind: "stx_transfer",
        asset: "STX",
        amountMicroStx: String(se?.amount ?? "0"),
        sender: se?.sender,
        recipient: se?.recipient,
        memo: se?.memo,
      });
      continue;
    }

    // FT transfer event
    if (et === "fungible_token_asset" || et === "ft_transfer_event" || e?.ft_transfer_event) {
      const fe = e?.ft_transfer_event || e;
      const asset =
        fe?.asset_identifier ||
        fe?.asset ||
        e?.asset_identifier ||
        "FT";
      events.push({
        kind: "ft_transfer",
        asset,
        amount: String(fe?.amount ?? "0"),
        sender: fe?.sender,
        recipient: fe?.recipient,
      });
      continue;
    }

    // NFT transfer event
    if (et === "non_fungible_token_asset" || et === "nft_transfer_event" || e?.nft_transfer_event) {
      const ne = e?.nft_transfer_event || e;
      const asset =
        ne?.asset_identifier ||
        ne?.asset ||
        e?.asset_identifier ||
        "NFT";
      events.push({
        kind: "nft_transfer",
        asset,
        sender: ne?.sender,
        recipient: ne?.recipient,
        tokenId: ne?.value?.repr || ne?.token_id || undefined,
      });
      continue;
    }

    // Contract event / print event / unknown
    if (et === "contract_log_event" || et === "smart_contract_log_event") {
      events.push({
        kind: "other",
        label: "contract_log_event",
        raw: e,
      });
      continue;
    }

    events.push({
      kind: "other",
      label: et || "event",
      raw: e,
    });
  }

  // Always include a contract_call marker if tx type says contract_call
  if (tx?.contract_call?.contract_id && tx?.contract_call?.function_name) {
    events.unshift({
      kind: "contract_call",
      contractId: tx.contract_call.contract_id,
      functionName: tx.contract_call.function_name,
    });
  }

  return events;
}

/**
 * ✅ This is the export your `route.ts` expects.
 * Input: Hiro tx JSON from /extended/v1/tx/:txid
 * Output: ParsedStacksTx (JSON-safe, no BigInt)
 */
export function parseStacksTransaction(txJson: any, network: Network): ParsedStacksTx {
  const { sender, type, status, blockHeight, canonical, timestamp, txid } = parsePrimaryFields(txJson);

  const feeMicroStx = guessFeeMicro(txJson);
  const feeStx = microToStxString(feeMicroStx);

  const rc = parseRecipientAndContract(txJson);

  const amountMicroStx = rc.amountMicroStx;
  const amountStx = microToStxString(amountMicroStx);

  const events = parseEvents(txJson);

  return {
    network,
    txid,
    status,
    type,
    sender,
    recipientOrTarget: rc.recipientOrTarget,
    contractId: rc.contractId,
    functionName: rc.functionName,
    memo: rc.memo,

    feeMicroStx,
    feeStx,
    amountMicroStx,
    amountStx,

    blockHeight,
    timestamp,
    canonical,

    events,
    raw: txJson,
  };
}