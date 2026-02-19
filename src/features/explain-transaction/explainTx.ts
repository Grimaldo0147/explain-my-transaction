// src/features/explain-transaction/explainTx.ts
import type { HiroEvent, HiroTx, Network } from "@/utils/parseStacksTx";

function formatMicroStxToStx(micro: any) {
  // Hiro often gives string numbers.
  // micro-STX => STX: divide by 1_000_000
  const s = String(micro ?? "");
  if (!/^\d+$/.test(s)) return null;

  // safe decimal formatting without floating drift
  const padded = s.padStart(7, "0"); // at least 1 digit + 6 decimals
  const whole = padded.slice(0, -6).replace(/^0+/, "") || "0";
  const frac = padded.slice(-6).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

function shortAddr(a?: string, left = 6, right = 4) {
  if (!a) return null;
  if (a.length <= left + right + 3) return a;
  return `${a.slice(0, left)}…${a.slice(-right)}`;
}

function pickRecipient(tx: HiroTx): string | null {
  if (tx?.tx_type === "token_transfer") {
    return tx?.token_transfer?.recipient_address ?? null;
  }
  if (tx?.tx_type === "contract_call") {
    return tx?.contract_call?.contract_id ?? null;
  }
  if (tx?.tx_type === "smart_contract") {
    return tx?.smart_contract?.contract_id ?? null;
  }
  return null;
}

function pickAmount(tx: HiroTx): { raw: string | null; stx: string | null } {
  if (tx?.tx_type === "token_transfer") {
    const raw = tx?.token_transfer?.amount ?? null;
    return { raw: raw ? String(raw) : null, stx: raw ? formatMicroStxToStx(raw) : null };
  }
  return { raw: null, stx: null };
}

function normalizeEvents(events: HiroEvent[]) {
  // Keep it simple + UI-friendly (you can expand later)
  return events.slice(0, 50).map((e) => {
    const type = e?.event_type || e?.type || "event";
    const asset = e?.asset?.asset_id || e?.asset?.asset_identifier || e?.asset_identifier || null;

    // STX transfers sometimes appear under "stx_asset" / "stx_transfer_event"
    const amount =
      e?.stx_transfer_event?.amount ??
      e?.stx_asset?.amount ??
      e?.token_transfer_event?.amount ??
      e?.ft_transfer_event?.amount ??
      e?.nft_transfer_event?.asset_id ??
      null;

    const sender =
      e?.stx_transfer_event?.sender ??
      e?.ft_transfer_event?.sender ??
      e?.nft_transfer_event?.sender ??
      e?.sender ??
      null;

    const recipient =
      e?.stx_transfer_event?.recipient ??
      e?.ft_transfer_event?.recipient ??
      e?.nft_transfer_event?.recipient ??
      e?.recipient ??
      null;

    return {
      type,
      asset,
      amount: amount != null ? String(amount) : null,
      sender,
      recipient,
      senderShort: shortAddr(sender || undefined),
      recipientShort: shortAddr(recipient || undefined),
      raw: e,
    };
  });
}

export function explainTransaction(input: {
  network: Network;
  txid: string; // 0x...
  tx: HiroTx;
  events: HiroEvent[];
}) {
  const { network, txid, tx, events } = input;

  const feeMicro = tx?.fee_rate ?? tx?.fee ?? tx?.execution_cost_read_count ?? null;
  const feeStx = formatMicroStxToStx(tx?.fee_rate ?? tx?.fee);

  const sender = tx?.sender_address ?? tx?.origin_address ?? null;
  const recipient = pickRecipient(tx);
  const amount = pickAmount(tx);

  const status =
    tx?.tx_status ||
    (tx?.canonical === false ? "dropped" : null) ||
    (tx?.block_height ? "success" : "pending");

  const type = tx?.tx_type ?? tx?.type ?? "unknown";

  const when =
    tx?.burn_block_time_iso ||
    tx?.block_time_iso ||
    tx?.burn_block_time ||
    tx?.block_time ||
    null;

  const normalizedEvents = normalizeEvents(events);

  // Helpful “cards”
  const cards = {
    sender: {
      title: "Sender",
      value: sender,
      valueShort: shortAddr(sender || undefined),
    },
    recipient: {
      title: "Recipient / Target",
      value: recipient,
      valueShort: shortAddr(recipient || undefined),
    },
    amount: {
      title: "Amount",
      value: amount.stx ? `${amount.stx} STX` : amount.raw ? String(amount.raw) : null,
      microStx: amount.raw,
    },
    fee: {
      title: "Fee",
      value: feeStx ? `${feeStx} STX` : (feeMicro != null ? String(feeMicro) : null),
      microStx: tx?.fee_rate ?? tx?.fee ?? null,
    },
    type: {
      title: "Type",
      value: type,
    },
    status: {
      title: "Status",
      value: status,
    },
  };

  // Extra details by type
  let details: any = null;
  if (type === "token_transfer") {
    details = {
      memo: tx?.token_transfer?.memo ?? null,
      recipient: tx?.token_transfer?.recipient_address ?? null,
      amountMicroStx: tx?.token_transfer?.amount ?? null,
      amountStx: formatMicroStxToStx(tx?.token_transfer?.amount),
    };
  } else if (type === "contract_call") {
    details = {
      contract_id: tx?.contract_call?.contract_id ?? null,
      function_name: tx?.contract_call?.function_name ?? null,
      function_args: tx?.contract_call?.function_args ?? null,
    };
  } else if (type === "smart_contract") {
    details = {
      contract_id: tx?.smart_contract?.contract_id ?? null,
      clarity_version: tx?.smart_contract?.clarity_version ?? null,
    };
  }

  return {
    ok: true,
    network,
    txid,
    overview: {
      txid,
      network,
      status,
      type,
      sender,
      recipient,
      feeMicroStx: tx?.fee_rate ?? tx?.fee ?? null,
      feeStx,
      block_height: tx?.block_height ?? null,
      burn_block_height: tx?.burn_block_height ?? null,
      timestamp: when,
      canonical: typeof tx?.canonical === "boolean" ? tx.canonical : null,
    },
    cards,
    details,
    events: normalizedEvents,
    rawTx: tx, // still JSON-safe (Hiro response)
  };
}