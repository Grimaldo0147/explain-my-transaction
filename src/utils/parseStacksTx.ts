export type Network = "mainnet" | "testnet";

export type ParsedEvent =
  | {
      kind: "stx_transfer";
      asset: "STX";
      sender?: string;
      recipient?: string;
      amountMicroStx: string;
      amountStx?: string;
      memo?: string;
      memoDecoded?: string;
      raw?: any;
    }
  | {
      kind: "ft_transfer";
      asset: string;
      sender?: string;
      recipient?: string;
      amount: string;
      raw?: any;
    }
  | {
      kind: "nft_transfer";
      asset: string;
      sender?: string;
      recipient?: string;
      tokenId?: string;
      raw?: any;
    }
  | {
      kind: "contract_call";
      contractId: string;
      functionName?: string;
      raw?: any;
    }
  | {
      kind: "contract_deploy";
      contractId: string;
      raw?: any;
    }
  | {
      kind: "other";
      label: string;
      raw?: any;
    };

export type ParsedPostCondition = {
  type: "stx" | "fungible_token" | "non_fungible_token" | "unknown";
  principal?: string;
  conditionCode?: string;
  asset?: string;
  amount?: string;
  amountStx?: string;
  tokenId?: string;
  summary: string;
  raw?: any;
};

export type ParsedStacksTx = {
  network: Network;
  txid: string;
  status?: string;
  type?: string;
  sender?: string;
  recipientOrTarget?: string;
  contractId?: string;
  functionName?: string;
  memo?: string;
  memoDecoded?: string;

  feeMicroStx?: string;
  feeStx?: string;

  amountMicroStx?: string;
  amountStx?: string;

  blockHeight?: number;
  timestamp?: string;
  canonical?: boolean;

  postConditionMode?: string;
  postConditions: ParsedPostCondition[];

  events: ParsedEvent[];
  raw: any;
};

export function normalizeStacksTxid(input: string): string {
  const raw = (input || "").trim();
  if (!raw) return "";

  const direct = raw.startsWith("0x") ? raw : raw.length === 64 ? `0x${raw}` : "";
  if (direct && /^0x[0-9a-fA-F]{64}$/.test(direct)) {
    return direct.toLowerCase();
  }

  const match = raw.match(/(0x)?[0-9a-fA-F]{64}/);
  if (!match?.[0]) return "";

  const txid = match[0].startsWith("0x") ? match[0] : `0x${match[0]}`;
  return txid.toLowerCase();
}

function toBigIntSafe(v: any): bigint | null {
  try {
    if (v === null || v === undefined) return null;
    if (typeof v === "bigint") return v;
    if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.trunc(v));
    if (typeof v === "string" && v.trim() !== "") return BigInt(v);
    return null;
  } catch {
    return null;
  }
}

function microToStxString(micro?: string | null): string | undefined {
  if (!micro) return undefined;

  try {
    const n = BigInt(micro);
    const negative = n < 0n;
    const abs = negative ? -n : n;

    const whole = abs / 1_000_000n;
    const frac = abs % 1_000_000n;

    const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
    const out = fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();

    return negative ? `-${out}` : out;
  } catch {
    return undefined;
  }
}

function decodeHexMemo(memo?: string | null): string | undefined {
  if (!memo) return undefined;

  let hex = String(memo).trim();
  if (!hex) return undefined;

  if (hex.startsWith("0x") || hex.startsWith("0X")) {
    hex = hex.slice(2);
  }

  if (!hex || !/^[0-9a-fA-F]+$/.test(hex)) return undefined;
  if (hex.length % 2 !== 0) return undefined;

  try {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }

    while (bytes.length > 0 && bytes[bytes.length - 1] === 0) {
      bytes.pop();
    }

    if (bytes.length === 0) return undefined;

    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes)).trim();

    if (!decoded) return undefined;

    const printableChars = Array.from(decoded).filter((ch) => {
      const code = ch.charCodeAt(0);
      return (
        ch === "\n" ||
        ch === "\r" ||
        ch === "\t" ||
        (code >= 32 && code <= 126)
      );
    }).length;

    if (printableChars / decoded.length < 0.85) return undefined;

    return decoded;
  } catch {
    return undefined;
  }
}

function conditionCodeToText(code: any): string {
  const raw = String(code ?? "").toLowerCase();

  if (
    raw === "sent_equal_to" ||
    raw === "eq" ||
    raw === "equal" ||
    raw === "equal_to" ||
    raw === "sent_eq"
  ) {
    return "equal to";
  }

  if (
    raw === "sent_greater_than" ||
    raw === "gt" ||
    raw === "greater" ||
    raw === "greater_than"
  ) {
    return "greater than";
  }

  if (
    raw === "sent_greater_than_or_equal_to" ||
    raw === "gte" ||
    raw === "greater_equal" ||
    raw === "greater_than_or_equal"
  ) {
    return "greater than or equal to";
  }

  if (
    raw === "sent_less_than" ||
    raw === "lt" ||
    raw === "less" ||
    raw === "less_than"
  ) {
    return "less than";
  }

  if (
    raw === "sent_less_than_or_equal_to" ||
    raw === "lte" ||
    raw === "less_equal" ||
    raw === "less_than_or_equal"
  ) {
    return "less than or equal to";
  }

  if (raw) return raw.replace(/_/g, " ");
  return "unknown condition";
}

function getTopLevelTx(txJson: any) {
  return txJson?.tx ?? txJson;
}

function guessFeeMicro(tx: any): string | undefined {
  const direct =
    toBigIntSafe(tx?.fee) ??
    toBigIntSafe(tx?.tx_fee) ??
    toBigIntSafe(tx?.fee_micro_stx) ??
    toBigIntSafe(tx?.receipt?.fee);

  if (direct !== null) return direct.toString();

  // In many Hiro tx responses, fee_rate is already the usable fee value
  const feeRateDirect =
    toBigIntSafe(tx?.fee_rate) ??
    toBigIntSafe(tx?.receipt?.fee_rate);

  if (feeRateDirect !== null) {
    return feeRateDirect.toString();
  }

  const feeRate =
    toBigIntSafe(tx?.fee_rate_per_byte) ??
    toBigIntSafe(tx?.receipt?.fee_rate_per_byte);

  const txSize =
    toBigIntSafe(tx?.tx_size) ??
    toBigIntSafe(tx?.receipt?.tx_size);

  if (feeRate !== null && txSize !== null) {
    return (feeRate * txSize).toString();
  }

  return undefined;
}

function parsePrimaryFields(tx: any) {
  const sender =
    tx?.sender_address ||
    tx?.sender ||
    tx?.origin_address ||
    undefined;

  const status =
    tx?.tx_status ||
    tx?.status ||
    undefined;

  const blockHeight =
    typeof tx?.block_height === "number"
      ? tx.block_height
      : undefined;

  const canonical =
    typeof tx?.canonical === "boolean"
      ? tx.canonical
      : undefined;

  const timestamp =
    tx?.burn_block_time_iso ||
    tx?.block_time_iso ||
    tx?.receipt_time_iso ||
    undefined;

  const txidRaw =
    tx?.tx_id ||
    tx?.txid ||
    "";

  const txid = normalizeStacksTxid(txidRaw);

  return { sender, status, blockHeight, canonical, timestamp, txid };
}

function parseContractBits(tx: any) {
  if (tx?.contract_call) {
    return {
      contractId: tx.contract_call?.contract_id || undefined,
      functionName: tx.contract_call?.function_name || undefined,
    };
  }

  if (tx?.smart_contract) {
    return {
      contractId: tx.smart_contract?.contract_id || undefined,
      functionName: undefined,
    };
  }

  return {
    contractId: undefined,
    functionName: undefined,
  };
}

function parseTokenTransferBits(tx: any) {
  if (!tx?.token_transfer) {
    return {
      recipientOrTarget: undefined,
      memo: undefined,
      memoDecoded: undefined,
      amountMicroStx: undefined,
    };
  }

  const memo = tx.token_transfer?.memo || undefined;

  return {
    recipientOrTarget: tx.token_transfer?.recipient_address || undefined,
    memo,
    memoDecoded: decodeHexMemo(memo),
    amountMicroStx:
      tx.token_transfer?.amount !== undefined && tx.token_transfer?.amount !== null
        ? String(tx.token_transfer.amount)
        : undefined,
  };
}

function parseEventLikeObject(e: any): ParsedEvent {
  const eventType = e?.event_type || e?.type || "";

  if (eventType === "stx_asset") {
    const asset = e?.asset || {};
    const amountMicroStx =
      asset?.amount !== undefined && asset?.amount !== null
        ? String(asset.amount)
        : "0";
    const memo = asset?.memo || e?.memo || undefined;

    return {
      kind: "stx_transfer",
      asset: "STX",
      sender: asset?.sender || e?.sender || undefined,
      recipient: asset?.recipient || e?.recipient || undefined,
      amountMicroStx,
      amountStx: microToStxString(amountMicroStx),
      memo,
      memoDecoded: decodeHexMemo(memo),
      raw: e,
    };
  }

  if (eventType === "stx_transfer_event" || e?.stx_transfer_event) {
    const se = e?.stx_transfer_event || e;
    const amountMicroStx =
      se?.amount !== undefined && se?.amount !== null ? String(se.amount) : "0";
    const memo = se?.memo || undefined;

    return {
      kind: "stx_transfer",
      asset: "STX",
      sender: se?.sender || undefined,
      recipient: se?.recipient || undefined,
      amountMicroStx,
      amountStx: microToStxString(amountMicroStx),
      memo,
      memoDecoded: decodeHexMemo(memo),
      raw: e,
    };
  }

  if (eventType === "fungible_token_asset" || eventType === "ft_transfer_event" || e?.ft_transfer_event) {
    const fe = e?.ft_transfer_event || e;
    const assetObj = fe?.asset || e?.asset || {};
    const assetIdentifier =
      assetObj?.asset_id ||
      assetObj?.asset_identifier ||
      fe?.asset_identifier ||
      e?.asset_identifier ||
      "FT";

    return {
      kind: "ft_transfer",
      asset: String(assetIdentifier),
      sender: assetObj?.sender || fe?.sender || e?.sender || undefined,
      recipient: assetObj?.recipient || fe?.recipient || e?.recipient || undefined,
      amount:
        assetObj?.amount !== undefined && assetObj?.amount !== null
          ? String(assetObj.amount)
          : fe?.amount !== undefined && fe?.amount !== null
          ? String(fe.amount)
          : "0",
      raw: e,
    };
  }

  if (
    eventType === "non_fungible_token_asset" ||
    eventType === "nft_transfer_event" ||
    e?.nft_transfer_event
  ) {
    const ne = e?.nft_transfer_event || e;
    const assetObj = ne?.asset || e?.asset || {};
    const assetIdentifier =
      assetObj?.asset_id ||
      assetObj?.asset_identifier ||
      ne?.asset_identifier ||
      e?.asset_identifier ||
      "NFT";

    return {
      kind: "nft_transfer",
      asset: String(assetIdentifier),
      sender: assetObj?.sender || ne?.sender || e?.sender || undefined,
      recipient: assetObj?.recipient || ne?.recipient || e?.recipient || undefined,
      tokenId:
        assetObj?.value?.repr ||
        assetObj?.value ||
        ne?.value?.repr ||
        ne?.value ||
        ne?.token_id ||
        undefined,
      raw: e,
    };
  }

  return {
    kind: "other",
    label: eventType || "event",
    raw: e,
  };
}

function parseEvents(tx: any): ParsedEvent[] {
  const out: ParsedEvent[] = [];
  const rawEvents: any[] = Array.isArray(tx?.events) ? tx.events : [];

  for (const e of rawEvents) {
    out.push(parseEventLikeObject(e));
  }

  if (tx?.contract_call?.contract_id) {
    out.unshift({
      kind: "contract_call",
      contractId: tx.contract_call.contract_id,
      functionName: tx.contract_call?.function_name || undefined,
      raw: tx?.contract_call,
    });
  } else if (tx?.smart_contract?.contract_id) {
    out.unshift({
      kind: "contract_deploy",
      contractId: tx.smart_contract.contract_id,
      raw: tx?.smart_contract,
    });
  }

  return out;
}

function inferTypeAndCoreFields(
  tx: any,
  sender?: string,
  events?: ParsedEvent[]
): {
  type?: string;
  recipientOrTarget?: string;
  contractId?: string;
  functionName?: string;
  memo?: string;
  memoDecoded?: string;
  amountMicroStx?: string;
} {
  const contractBits = parseContractBits(tx);
  const tokenBits = parseTokenTransferBits(tx);

  if (tx?.tx_type) {
    const declared = String(tx.tx_type);

    if (declared === "token_transfer") {
      return {
        type: "token_transfer",
        recipientOrTarget: tokenBits.recipientOrTarget,
        memo: tokenBits.memo,
        memoDecoded: tokenBits.memoDecoded,
        amountMicroStx: tokenBits.amountMicroStx,
      };
    }

    if (declared === "contract_call") {
      return {
        type: "contract_call",
        recipientOrTarget: contractBits.contractId,
        contractId: contractBits.contractId,
        functionName: contractBits.functionName,
      };
    }

    if (declared === "smart_contract") {
      return {
        type: "smart_contract",
        recipientOrTarget: contractBits.contractId,
        contractId: contractBits.contractId,
      };
    }

    return {
      type: declared,
      recipientOrTarget: tokenBits.recipientOrTarget || contractBits.contractId,
      contractId: contractBits.contractId,
      functionName: contractBits.functionName,
      memo: tokenBits.memo,
      memoDecoded: tokenBits.memoDecoded,
      amountMicroStx: tokenBits.amountMicroStx,
    };
  }

  const parsedEvents = events || parseEvents(tx);

  const stxTransfer = parsedEvents.find((e) => e.kind === "stx_transfer") as
    | Extract<ParsedEvent, { kind: "stx_transfer" }>
    | undefined;

  if (stxTransfer) {
    const amountMicroStx = stxTransfer.amountMicroStx;
    const recipientOrTarget =
      stxTransfer.sender && sender && stxTransfer.sender === sender
        ? stxTransfer.recipient
        : stxTransfer.recipient || stxTransfer.sender;

    return {
      type: "stx_transfer",
      recipientOrTarget,
      memo: stxTransfer.memo,
      memoDecoded: stxTransfer.memoDecoded,
      amountMicroStx,
    };
  }

  if (tx?.token_transfer) {
    return {
      type: "token_transfer",
      recipientOrTarget: tokenBits.recipientOrTarget,
      memo: tokenBits.memo,
      memoDecoded: tokenBits.memoDecoded,
      amountMicroStx: tokenBits.amountMicroStx,
    };
  }

  if (tx?.contract_call) {
    return {
      type: "contract_call",
      recipientOrTarget: contractBits.contractId,
      contractId: contractBits.contractId,
      functionName: contractBits.functionName,
    };
  }

  if (tx?.smart_contract) {
    return {
      type: "smart_contract",
      recipientOrTarget: contractBits.contractId,
      contractId: contractBits.contractId,
    };
  }

  return {
    type: "unknown",
  };
}

function extractPrincipal(pc: any): string | undefined {
  return (
    pc?.principal ||
    pc?.principal?.address ||
    pc?.principal?.origin ||
    pc?.contract_id ||
    pc?.address ||
    undefined
  );
}

function extractAsset(pc: any): string | undefined {
  return (
    pc?.asset ||
    pc?.asset_info ||
    pc?.asset_identifier ||
    pc?.asset_id ||
    pc?.contract_asset ||
    undefined
  );
}

function extractConditionCode(pc: any): string | undefined {
  const raw =
    pc?.condition_code ??
    pc?.conditionCode ??
    pc?.fungible_condition_code ??
    pc?.non_fungible_condition_code ??
    pc?.code;

  if (raw === undefined || raw === null) return undefined;
  return String(raw);
}

function parseSinglePostCondition(pc: any): ParsedPostCondition {
  const typeRaw = String(
    pc?.type ??
      pc?.post_condition_type ??
      pc?.asset_type ??
      "unknown"
  ).toLowerCase();

  const principal = extractPrincipal(pc);
  const conditionCode = extractConditionCode(pc);
  const conditionText = conditionCodeToText(conditionCode);

  if (typeRaw.includes("stx")) {
    const amount =
      pc?.amount !== undefined && pc?.amount !== null ? String(pc.amount) : undefined;
    const amountStx = microToStxString(amount);

    return {
      type: "stx",
      principal,
      conditionCode,
      amount,
      amountStx,
      summary: `Must transfer STX ${conditionText}${amountStx ? ` ${amountStx} STX` : ""}.`,
      raw: pc,
    };
  }

  if (typeRaw.includes("fungible")) {
    const asset = extractAsset(pc);
    const amount =
      pc?.amount !== undefined && pc?.amount !== null ? String(pc.amount) : undefined;

    return {
      type: "fungible_token",
      principal,
      conditionCode,
      asset,
      amount,
      summary: `Must transfer ${asset || "token"} ${conditionText}${amount ? ` ${amount}` : ""}.`,
      raw: pc,
    };
  }

  if (typeRaw.includes("non_fungible") || typeRaw.includes("nft")) {
    const asset = extractAsset(pc);
    const tokenId =
      pc?.asset_value?.repr ||
      pc?.asset_value ||
      pc?.value?.repr ||
      pc?.value ||
      pc?.token_id ||
      undefined;

    return {
      type: "non_fungible_token",
      principal,
      conditionCode,
      asset,
      tokenId: tokenId ? String(tokenId) : undefined,
      summary: `Must transfer NFT ${asset || ""}${tokenId ? ` (${tokenId})` : ""} ${conditionText}.`.trim(),
      raw: pc,
    };
  }

  return {
    type: "unknown",
    principal,
    conditionCode,
    asset: extractAsset(pc),
    summary: "Contains a post condition rule.",
    raw: pc,
  };
}

function parsePostConditions(tx: any): ParsedPostCondition[] {
  const raw =
    tx?.post_conditions ||
    tx?.postConditions ||
    tx?.post_condition ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw.map(parseSinglePostCondition);
}

function parsePostConditionMode(tx: any): string | undefined {
  const mode =
    tx?.post_condition_mode ??
    tx?.postConditionMode ??
    tx?.post_conditions_mode;

  if (mode === undefined || mode === null) return undefined;

  const s = String(mode).toLowerCase();

  if (s === "allow" || s === "deny") return s;
  if (s === "0") return "allow";
  if (s === "1") return "deny";

  return s;
}

export function parseStacksTransaction(txJson: any, network: Network): ParsedStacksTx {
  const tx = getTopLevelTx(txJson);
  const primary = parsePrimaryFields(tx);
  const events = parseEvents(tx);
  const inferred = inferTypeAndCoreFields(tx, primary.sender, events);

  const feeMicroStx = guessFeeMicro(tx);
  const feeStx = microToStxString(feeMicroStx);

  const amountMicroStx = inferred.amountMicroStx;
  const amountStx = microToStxString(amountMicroStx);

  const postConditions = parsePostConditions(tx);
  const postConditionMode = parsePostConditionMode(tx);

  return {
    network,
    txid: primary.txid,
    status: primary.status,
    type: inferred.type,
    sender: primary.sender,
    recipientOrTarget: inferred.recipientOrTarget,
    contractId: inferred.contractId,
    functionName: inferred.functionName,
    memo: inferred.memo,
    memoDecoded: inferred.memoDecoded,

    feeMicroStx,
    feeStx,

    amountMicroStx,
    amountStx,

    blockHeight: primary.blockHeight,
    timestamp: primary.timestamp,
    canonical: primary.canonical,

    postConditionMode,
    postConditions,

    events,
    raw: txJson,
  };
}