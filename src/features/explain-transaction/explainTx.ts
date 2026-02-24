// src/features/explain-transaction/explainTx.ts

type AnyObj = Record<string, any>;

function fmtStx(microStxLike: string | number | null | undefined) {
  if (microStxLike == null) return "—";
  const n = typeof microStxLike === "number" ? microStxLike : Number(microStxLike);
  if (!Number.isFinite(n)) return String(microStxLike);
  return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })} STX`;
}

function safeStr(v: any) {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return JSON.stringify(v);
}

function pickAmountAndRecipient(tx: AnyObj) {
  // Hiro tx objects usually include one of these depending on tx_type
  if (tx?.tx_type === "token_transfer" && tx?.token_transfer) {
    const tt = tx.token_transfer;
    return {
      amount: safeStr(tt.amount),
      amountLabel: tt.asset_identifier ? `${tt.amount} (${tt.asset_identifier})` : safeStr(tt.amount),
      recipient: safeStr(tt.recipient_address),
      sender: safeStr(tt.sender_address ?? tx.sender_address),
    };
  }

  if (tx?.tx_type === "stx_transfer" && tx?.stx_transfer) {
    const st = tx.stx_transfer;
    return {
      amount: safeStr(st.amount),
      amountLabel: fmtStx(st.amount),
      recipient: safeStr(st.recipient_address),
      sender: safeStr(st.sender_address ?? tx.sender_address),
    };
  }

  // Contract calls / smart contracts / coinbase etc
  return {
    amount: "—",
    amountLabel: "—",
    recipient: tx?.contract_call?.contract_id
      ? safeStr(tx.contract_call.contract_id)
      : tx?.smart_contract?.contract_id
        ? safeStr(tx.smart_contract.contract_id)
        : "—",
    sender: safeStr(tx.sender_address),
  };
}

export function explainTransaction(tx: AnyObj, events: AnyObj[] | null) {
  const { amountLabel, recipient, sender } = pickAmountAndRecipient(tx);

  const type = safeStr(tx.tx_type ?? "—");
  const status = safeStr(tx.tx_status ?? "—");
  const feeRate = tx.fee_rate ?? tx.fee ?? tx.fee_rate;
  const fee = feeRate != null ? `${Number(feeRate).toLocaleString()} µSTX` : "—";

  const block = tx.block_height != null ? safeStr(tx.block_height) : "—";
  const timeIso = tx.burn_block_time_iso ?? tx.receipt_time_iso ?? null;
  const time = timeIso ? new Date(timeIso).toLocaleString() : "—";

  const eventCount =
    typeof tx.event_count === "number"
      ? tx.event_count
      : Array.isArray(events)
        ? events.length
        : "—";

  const headline =
    type === "stx_transfer"
      ? "STX transfer"
      : type === "token_transfer"
        ? "Token transfer"
        : type === "contract_call"
          ? "Contract call"
          : type === "smart_contract"
            ? "Contract deploy"
            : "Stacks transaction";

  const cards = [
    { title: "Sender", value: sender },
    { title: "Recipient / Target", value: recipient },
    { title: "Amount", value: amountLabel },
    { title: "Fee rate", value: fee },
    { title: "Type", value: type },
    { title: "Status", value: status },
    { title: "Block height", value: block },
    { title: "Time", value: time },
    { title: "Events", value: safeStr(eventCount) },
  ];

  const compactEvents =
    Array.isArray(events) && events.length
      ? events.slice(0, 30).map((e) => ({
          event_type: e.event_type ?? e.type ?? "—",
          asset_identifier: e.asset?.asset_identifier ?? e.asset_identifier ?? undefined,
          sender: e.sender ?? e.from ?? undefined,
          recipient: e.recipient ?? e.to ?? undefined,
          amount: e.amount ?? e.value ?? undefined,
        }))
      : [];

  return { headline, cards, events: compactEvents };
}