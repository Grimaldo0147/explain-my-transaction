"use client";

import React, { useMemo, useState } from "react";

type ApiOk = {
  ok: true;
  txid: string;
  networkChecked?: string;
  source?: string;
  tx?: any;
  explained?: any;
};

type ApiErr = {
  ok?: false;
  error: string;
  step?: string;
  message?: string;
  status?: number;
  networkChecked?: string;
  source?: string;
  note?: string;
  stack?: string;
  raw?: string;
};

type ApiResponse = ApiOk | ApiErr;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function strip0x(input: string) {
  return input.startsWith("0x") ? input.slice(2) : input;
}

function isValidTxid(input: string) {
  const x = strip0x(input.trim());
  return /^[0-9a-fA-F]{64}$/.test(x);
}

function shorten(s: string, left = 10, right = 8) {
  if (!s) return "—";
  if (s.length <= left + right + 3) return s;
  return `${s.slice(0, left)}…${s.slice(-right)}`;
}

function copyToClipboard(text: string) {
  if (typeof navigator === "undefined") return;
  navigator.clipboard?.writeText(text).catch(() => {});
}

function safeJsonStringify(value: any) {
  // handles BigInt + circular
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      if (typeof v === "object" && v !== null) {
        if (seen.has(v)) return "[Circular]";
        seen.add(v);
      }
      return v;
    },
    2
  );
}

// --- amount formatting helpers ---
function formatSTXFromMicro(micro: string | number | bigint) {
  // microSTX -> STX
  try {
    const n = typeof micro === "bigint" ? micro : BigInt(String(micro));
    const sign = n < 0n ? "-" : "";
    const abs = n < 0n ? -n : n;
    const whole = abs / 1_000_000n;
    const frac = abs % 1_000_000n;
    const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
    return fracStr ? `${sign}${whole.toString()}.${fracStr}` : `${sign}${whole.toString()}`;
  } catch {
    return String(micro);
  }
}

function formatMaybeMicroSTX(v: any) {
  // if it looks like an integer string, show as STX
  if (v === null || v === undefined) return "—";
  const s = String(v);
  if (/^-?\d+$/.test(s)) return formatSTXFromMicro(s);
  return s;
}

// --- UI bits ---
function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const toneCls =
    tone === "good"
      ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-200 ring-amber-500/20"
      : tone === "bad"
      ? "bg-rose-500/10 text-rose-200 ring-rose-500/20"
      : "bg-white/5 text-white/80 ring-white/10";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1", toneCls)}>
      {children}
    </span>
  );
}

function Card({
  title,
  value,
  sub,
  right,
  mono,
  onCopy,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  mono?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_55%)]" />
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium tracking-wide text-white/60">{title}</div>
          <div className={cn("mt-1 break-words text-sm font-semibold text-white", mono && "font-mono text-[13px]")}>
            {value}
          </div>
          {sub ? <div className="mt-1 text-xs text-white/50">{sub}</div> : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {right}
          {onCopy ? (
            <button
              onClick={onCopy}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
              title="Copy"
              type="button"
            >
              Copy
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mt-8 mb-3">
      <div className="text-sm font-semibold text-white">{title}</div>
      {desc ? <div className="mt-1 text-xs text-white/55">{desc}</div> : null}
    </div>
  );
}

export default function Page() {
  const [txid, setTxid] = useState("0x41e21f993c03461aa1856b9cedb15d75ea78d6a26472f031add7a4fd785d9177");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<ApiResponse | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const normalized = useMemo(() => {
    const t = txid.trim();
    if (!t) return "";
    const stripped = strip0x(t);
    return stripped ? `0x${stripped.toLowerCase()}` : "";
  }, [txid]);

  const valid = useMemo(() => isValidTxid(txid), [txid]);

  const summary = useMemo(() => {
    const ok = res && (res as any).ok === true;
    const tx = ok ? (res as ApiOk).tx : null;
    const explained = ok ? (res as ApiOk).explained : null;

    // Prefer explained fields if present, fall back to tx shape
    const t: any = explained || tx || {};

    const statusRaw = (tx?.tx_status || tx?.status || t?.status || "—") as string;
    const statusLower = String(statusRaw).toLowerCase();
    const statusTone =
      statusLower.includes("success") || statusLower.includes("confirmed")
        ? "good"
        : statusLower.includes("pending")
        ? "warn"
        : statusLower.includes("fail") || statusLower.includes("abort")
        ? "bad"
        : "neutral";

    const type = tx?.tx_type || tx?.type || t?.type || "—";

    const sender =
      t?.sender_address ||
      tx?.sender_address ||
      tx?.sender ||
      tx?.originator_address ||
      t?.sender ||
      "—";

    const recipient =
      t?.recipient_address ||
      tx?.token_transfer?.recipient_address ||
      tx?.recipient_address ||
      tx?.recipient ||
      t?.recipient ||
      "—";

    // Fee: many APIs give integer microSTX
    const feeMicro =
      tx?.fee_rate ?? tx?.fee ?? tx?.tx_fee ?? t?.fee_rate ?? t?.fee ?? t?.tx_fee ?? null;

    // Amount detection:
    // 1) STX transfers (common in tx.token_transfer.amount)
    let amountText: string | null = null;
    let assetText: string | null = null;

    if (tx?.token_transfer?.amount != null) {
      amountText = formatSTXFromMicro(tx.token_transfer.amount);
      assetText = "STX";
    }

    // 2) FT/NFT transfers could be in tx.ft_transfers / tx.nft_transfers / tx.events
    const ftTransfers = tx?.ft_transfers || t?.ft_transfers;
    const nftTransfers = tx?.nft_transfers || t?.nft_transfers;

    if (!amountText && Array.isArray(ftTransfers) && ftTransfers.length) {
      // take first transfer (you can expand later)
      const e: any = ftTransfers[0];
      amountText = e?.amount != null ? String(e.amount) : null;
      assetText = e?.asset_identifier || e?.token || "FT";
    }

    if (!amountText && Array.isArray(nftTransfers) && nftTransfers.length) {
      const e: any = nftTransfers[0];
      // NFTs have no numeric amount; show token id/value
      amountText = e?.value != null ? String(e.value) : "1";
      assetText = e?.asset_identifier || e?.token || "NFT";
    }

    // 3) Some “explained” objects might already have friendly amount/asset
    if (!amountText && t?.amount != null) amountText = String(t.amount);
    if (!assetText && t?.asset != null) assetText = String(t.asset);

    const blockHeight = tx?.block_height ?? t?.block_height ?? null;
    const timestamp = tx?.burn_block_time_iso || tx?.block_time_iso || t?.timestamp || null;

    // events (best effort)
    const events =
      tx?.events ||
      tx?.contract_logs ||
      tx?.stx_transfers ||
      tx?.ft_transfers ||
      tx?.nft_transfers ||
      t?.events ||
      [];

    return {
      ok,
      tx,
      explained,
      statusRaw,
      statusTone,
      type,
      sender,
      recipient,
      feeMicro,
      amountText,
      assetText,
      blockHeight,
      timestamp,
      events: Array.isArray(events) ? events : [],
      networkChecked: ok ? (res as ApiOk).networkChecked : (res as ApiErr | null)?.networkChecked,
      source: ok ? (res as ApiOk).source : (res as ApiErr | null)?.source,
    };
  }, [res]);

  async function onExplain() {
    setShowDebug(false);

    if (!valid) {
      setRes({
        error: "That doesn’t look like a valid Stacks transaction ID (64 hex characters).",
        step: "validate",
        status: 400,
      });
      return;
    }

    setLoading(true);
    setRes(null);

    try {
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txid: normalized }),
      });

      // Handle non-JSON (Next error HTML, etc.)
      const contentType = r.headers.get("content-type") || "";
      let payload: any = null;

      if (contentType.includes("application/json")) {
        payload = await r.json();
      } else {
        const raw = await r.text();
        payload = {
          error: "Server returned non-JSON response.",
          step: "fetch",
          status: r.status,
          message: raw,
          raw,
        };
      }

      // Ensure we always store something predictable
      if (payload && typeof payload === "object") {
        setRes(payload as ApiResponse);
      } else {
        setRes({
          error: "Unexpected server response.",
          step: "fetch",
          status: r.status,
          message: String(payload),
        });
      }
    } catch (e: any) {
      setRes({
        error: "Network error while explaining transaction.",
        step: "fetch",
        status: 0,
        message: e?.message || "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  const heroStatus = summary.ok ? (
    <Badge tone={summary.statusTone as any}>{String(summary.statusRaw)}</Badge>
  ) : res ? (
    <Badge tone="bad">Error</Badge>
  ) : (
    <Badge tone="neutral">Ready</Badge>
  );

  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      {/* Premium background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(99,102,241,0.25),transparent_45%),radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.18),transparent_45%),radial-gradient(circle_at_50%_90%,rgba(236,72,153,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_30%,rgba(255,255,255,0.03))]" />
        <div className="absolute inset-0 opacity-[0.25] [background-image:radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <main className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.65)]" />
              Explain transactions like a product
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Explain My Transaction
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Paste a Stacks txid and get a clean, card-based breakdown: Sender, Recipient, Amount, Fee, Type, and Events.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {heroStatus}
            <button
              type="button"
              onClick={() => copyToClipboard(normalized || txid)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
            >
              Copy txid
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-medium text-white/60">Stacks transaction ID</label>
              <input
                value={txid}
                onChange={(e) => setTxid(e.target.value)}
                placeholder="Paste txid (with or without 0x)"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-[13px] text-white outline-none placeholder:text-white/30 focus:border-white/20"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/45">
                <span>Tip: You can paste with 0x — we normalize it automatically.</span>
                {txid.trim() ? (
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono">
                    Normalized: {normalized || "—"}
                  </span>
                ) : null}
              </div>
              {!valid && txid.trim() ? (
                <div className="mt-2 text-xs text-rose-300">
                  Invalid txid. Expected 64 hex characters (0-9, a-f).
                </div>
              ) : null}
            </div>

            <div className="sm:pt-7">
              <button
                type="button"
                onClick={onExplain}
                disabled={loading}
                className={cn(
                  "w-full rounded-xl px-5 py-3 text-sm font-semibold shadow-[0_16px_60px_rgba(99,102,241,0.25)] sm:w-auto",
                  loading
                    ? "cursor-not-allowed bg-white/10 text-white/60"
                    : "bg-white text-black hover:bg-white/90"
                )}
              >
                {loading ? "Explaining…" : "Explain"}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {res && !(res as any).ok ? (
          <div className="mt-6 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-rose-100">
                  {(res as ApiErr).error || "Error"}
                </div>
                <div className="mt-1 text-xs text-rose-100/70">
                  Step: {(res as ApiErr).step || "—"} • Status: {(res as ApiErr).status ?? "—"}
                </div>
                {(res as ApiErr).message ? (
                  <div className="mt-2 text-xs text-rose-100/70">
                    Message: {(res as ApiErr).message}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setShowDebug((s) => !s)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
              >
                {showDebug ? "Hide debug" : "Show debug"}
              </button>
            </div>

            {showDebug ? (
              <pre className="mt-4 max-h-[320px] overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[12px] text-white/75">
                {safeJsonStringify(res)}
              </pre>
            ) : null}
          </div>
        ) : null}

        {/* Results */}
        {summary.ok ? (
          <>
            <SectionTitle title="Transaction overview" desc="Clean cards like a real product. Copy addresses, scan fast." />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card
                title="Transaction"
                value={<span className="font-mono">{shorten((res as ApiOk).txid || normalized || txid, 14, 10)}</span>}
                sub="Click copy to share"
                mono
                onCopy={() => copyToClipboard((res as ApiOk).txid || normalized || txid)}
                right={<Badge tone={summary.statusTone as any}>{String(summary.statusRaw)}</Badge>}
              />

              <Card
                title="Type"
                value={String(summary.type)}
                sub="Tx category"
                right={<Badge tone="neutral">Stacks</Badge>}
              />

              <Card
                title="Network source"
                value={summary.networkChecked ? shorten(summary.networkChecked, 18, 0) : "—"}
                sub={summary.source ? shorten(summary.source, 26, 0) : "—"}
              />

              <Card
                title="Sender"
                value={<span className="font-mono">{summary.sender}</span>}
                mono
                onCopy={() => copyToClipboard(String(summary.sender))}
              />

              <Card
                title="Recipient"
                value={<span className="font-mono">{summary.recipient}</span>}
                mono
                onCopy={() => copyToClipboard(String(summary.recipient))}
              />

              <Card
                title="Amount"
                value={
                  summary.amountText
                    ? `${summary.amountText} ${summary.assetText ?? ""}`.trim()
                    : "—"
                }
                sub={summary.assetText ? `Asset: ${summary.assetText}` : "Auto-detected from tx/events"}
              />

              <Card
                title="Fee"
                value={summary.feeMicro != null ? `${formatSTXFromMicro(summary.feeMicro)} STX` : "—"}
                sub={summary.feeMicro != null ? `(${summary.feeMicro} microSTX)` : "—"}
              />

              <Card
                title="Block height"
                value={summary.blockHeight != null ? String(summary.blockHeight) : "—"}
                sub={summary.timestamp ? String(summary.timestamp) : "—"}
              />

              <Card
                title="Events"
                value={Array.isArray(summary.events) ? String(summary.events.length) : "0"}
                sub="Transfers, logs, and actions"
              />
            </div>

            <SectionTitle title="Events" desc="A compact list you can expand later into richer cards." />

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              {summary.events.length ? (
                <div className="space-y-3">
                  {summary.events.slice(0, 25).map((e: any, idx: number) => {
                    const label =
                      e?.event_type ||
                      e?.asset_event_type ||
                      e?.type ||
                      e?.tx_type ||
                      "event";

                    const asset =
                      e?.asset_identifier ||
                      e?.contract_identifier ||
                      e?.token ||
                      e?.contract_id ||
                      null;

                    const amount =
                      e?.amount != null
                        ? String(e.amount)
                        : e?.value != null
                        ? String(e.value)
                        : null;

                    const from = e?.sender || e?.sender_address || e?.from || null;
                    const to = e?.recipient || e?.recipient_address || e?.to || null;

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-white/10 bg-black/30 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">{String(label)}</Badge>
                          {asset ? <span className="text-xs text-white/70">{String(asset)}</span> : null}
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div className="text-xs text-white/60">
                            <span className="text-white/40">From:</span>{" "}
                            <span className="font-mono">{from ? shorten(String(from), 12, 10) : "—"}</span>
                          </div>
                          <div className="text-xs text-white/60">
                            <span className="text-white/40">To:</span>{" "}
                            <span className="font-mono">{to ? shorten(String(to), 12, 10) : "—"}</span>
                          </div>
                          <div className="text-xs text-white/60">
                            <span className="text-white/40">Amount/Value:</span>{" "}
                            <span className="font-mono">{amount ?? "—"}</span>
                          </div>
                        </div>

                        <details className="mt-2">
                          <summary className="cursor-pointer select-none text-xs text-white/55 hover:text-white/70">
                            Show raw event
                          </summary>
                          <pre className="mt-2 max-h-[240px] overflow-auto rounded-lg border border-white/10 bg-black/40 p-2 text-[12px] text-white/75">
                            {safeJsonStringify(e)}
                          </pre>
                        </details>
                      </div>
                    );
                  })}

                  {summary.events.length > 25 ? (
                    <div className="text-xs text-white/50">
                      Showing first 25 events. (You can paginate later.)
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-white/60">No events found for this transaction.</div>
              )}
            </div>

            <SectionTitle title="Debug payload" desc="Useful while you’re building. Remove in production." />

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <button
                type="button"
                onClick={() => setShowDebug((s) => !s)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
              >
                {showDebug ? "Hide debug" : "Show debug"}
              </button>

              {showDebug ? (
                <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[12px] text-white/75">
                  {safeJsonStringify(res)}
                </pre>
              ) : null}
            </div>
          </>
        ) : null}

        {/* Footer */}
        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/45">
          Built for clarity: txid → explanation → product cards.
        </div>
      </main>
    </div>
  );
}