"use client";

import React, { useMemo, useState } from "react";

type Network = "auto" | "mainnet" | "testnet";

type ApiOk = {
  ok?: boolean;
  // your API can return anything; we normalize safely below
  [key: string]: any;
};

type ApiErr = {
  error?: string;
  message?: string;
  status?: number;
  step?: string;
  [key: string]: any;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeTxid(input: string) {
  const trimmed = (input || "").trim();
  const no0x = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  return no0x.toLowerCase();
}

function isValidTxidHex64(hex: string) {
  return /^[0-9a-f]{64}$/i.test(hex);
}

function shortHash(s?: string, left = 6, right = 6) {
  if (!s) return "—";
  const t = String(s);
  if (t.length <= left + right + 3) return t;
  return `${t.slice(0, left)}…${t.slice(-right)}`;
}

function safeNum(x: any) {
  if (x === null || x === undefined) return undefined;
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function safeStr(x: any) {
  if (x === null || x === undefined) return undefined;
  if (typeof x === "string") return x;
  if (typeof x === "number" || typeof x === "boolean") return String(x);
  return undefined;
}

function tryPick(obj: any, paths: string[]) {
  for (const p of paths) {
    const parts = p.split(".");
    let cur = obj;
    let ok = true;
    for (const part of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, part)) cur = cur[part];
      else {
        ok = false;
        break;
      }
    }
    if (ok && cur !== undefined && cur !== null) return cur;
  }
  return undefined;
}

function formatMicroStx(micro: number) {
  // 1 STX = 1,000,000 microstacks
  const stx = micro / 1_000_000;
  // keep it product-y
  return `${stx.toLocaleString(undefined, { maximumFractionDigits: 6 })} STX`;
}

function formatDate(ts: any) {
  const v = safeNum(ts);
  if (!v) return "—";
  // Hiro often uses seconds; sometimes ms.
  const ms = v < 10_000_000_000 ? v * 1000 : v;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "red" | "amber" | "blue" | "purple";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/10 text-white/80 border-white/10",
    green: "bg-emerald-500/15 text-emerald-200 border-emerald-500/20",
    red: "bg-rose-500/15 text-rose-200 border-rose-500/20",
    amber: "bg-amber-500/15 text-amber-200 border-amber-500/20",
    blue: "bg-sky-500/15 text-sky-200 border-sky-500/20",
    purple: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[tone] || tones.neutral
      )}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-white/80">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="text-xs text-white/50">{k}</div>
      <div className={cn("text-sm text-white/90 text-right", mono && "font-mono")}>{v}</div>
    </div>
  );
}

function CopyButton({ value }: { value?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        if (!value) return;
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 900);
        } catch {}
      }}
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
      title="Copy"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/**
 * Heuristic normalization so your UI stays stable even if your API response changes.
 * It tries to read common Hiro fields and “your own” fields.
 */
function normalizeForUI(raw: any) {
  const tx = raw?.tx || raw?.data?.tx || raw?.result?.tx || raw;

  const txid =
    safeStr(tryPick(tx, ["tx_id", "txid", "id", "hash"])) ||
    safeStr(tryPick(raw, ["txid", "tx_id"])) ||
    undefined;

  const status = safeStr(tryPick(tx, ["tx_status", "status"])) || "unknown";
  const type =
    safeStr(tryPick(tx, ["tx_type", "type"])) ||
    safeStr(tryPick(raw, ["type"])) ||
    "unknown";

  const sender =
    safeStr(tryPick(tx, ["sender_address", "sender"])) ||
    safeStr(tryPick(tx, ["origin.address"])) ||
    undefined;

  const recipient =
    safeStr(tryPick(tx, ["recipient_address", "recipient"])) ||
    safeStr(tryPick(tx, ["token_transfer.recipient_address"])) ||
    safeStr(tryPick(tx, ["stx_transfer.recipient_address"])) ||
    safeStr(tryPick(raw, ["recipient"])) ||
    undefined;

  const contractId =
    safeStr(tryPick(tx, ["contract_call.contract_id", "smart_contract.contract_id"])) ||
    safeStr(tryPick(tx, ["contract_id"])) ||
    undefined;

  const functionName =
    safeStr(tryPick(tx, ["contract_call.function_name", "function_name"])) ||
    undefined;

  const fee = safeNum(tryPick(tx, ["fee_rate", "fee"])) ?? safeNum(tryPick(raw, ["fee"]));
  const nonce = safeNum(tryPick(tx, ["nonce"])) ?? safeNum(tryPick(raw, ["nonce"]));
  const blockHeight =
    safeNum(tryPick(tx, ["block_height"])) ?? safeNum(tryPick(raw, ["block_height"]));
  const burnBlockTime =
    safeNum(tryPick(tx, ["burn_block_time"])) ??
    safeNum(tryPick(tx, ["burn_block_time_iso"])) ??
    safeNum(tryPick(raw, ["burn_block_time"]));

  // Events: your API might return events/operations/transfers
  const events =
    (Array.isArray(raw?.events) && raw.events) ||
    (Array.isArray(tx?.events) && tx.events) ||
    (Array.isArray(raw?.operations) && raw.operations) ||
    (Array.isArray(raw?.transfers) && raw.transfers) ||
    [];

  // Amount if it exists (token transfer / stx transfer)
  const amountMicro =
    safeNum(tryPick(tx, ["token_transfer.amount", "stx_transfer.amount"])) ??
    safeNum(tryPick(raw, ["amount"])) ??
    undefined;

  // Human explanation (optional)
  const summary =
    safeStr(tryPick(raw, ["summary", "explanation", "human", "message"])) ||
    undefined;

  return {
    txid,
    status,
    type,
    sender,
    recipient,
    contractId,
    functionName,
    fee,
    nonce,
    blockHeight,
    burnBlockTime,
    amountMicro,
    events,
    summary,
    raw,
  };
}

export default function Page() {
  const [txid, setTxid] = useState(
    "0x77a717efbc45c577e9dad3901dc84e52c8317b6da86d2914e810c0df45455852"
  );
  const [network, setNetwork] = useState<Network>("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<ApiErr | null>(null);

  const normalized = useMemo(() => (result ? normalizeForUI(result) : null), [result]);

  async function handleExplain() {
    const normalizedTxid = normalizeTxid(txid);

    // frontend validation
    if (!isValidTxidHex64(normalizedTxid)) {
      setError({
        error: "Invalid txid",
        step: "validate",
        status: 400,
        message: "That doesn’t look like a valid Stacks transaction ID (64 hex characters).",
      });
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txid: normalizedTxid, network }),
      });

      const text = await res.text();
      let data: any = null;

      // Handle “HTML returned by mistake” safely
      try {
        data = JSON.parse(text);
      } catch {
        data = {
          error: "Server returned non-JSON response",
          step: "parse",
          status: res.status,
          message: text?.slice(0, 300) || "Unknown response",
          raw: text,
        };
      }

      if (!res.ok) {
        setError({
          error: data?.error || "Server error",
          step: data?.step || "explain",
          status: res.status,
          message: data?.message || data?.error || "Request failed",
          ...data,
        });
        return;
      }

      setResult(data);
    } catch (e: any) {
      setError({
        error: "Network error",
        step: "fetch",
        status: 0,
        message: e?.message || "Failed to reach /api/explain",
      });
    } finally {
      setLoading(false);
    }
  }

  const normalizedTxidLabel = useMemo(() => {
    const n = normalizeTxid(txid);
    return n ? `0x${n}` : "—";
  }, [txid]);

  const statusTone =
    normalized?.status === "success"
      ? "green"
      : normalized?.status === "pending"
      ? "amber"
      : normalized?.status === "abort_by_response" || normalized?.status === "failed"
      ? "red"
      : "neutral";

  return (
    <main className="min-h-screen bg-black text-white">
      {/* background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-fuchsia-500/15 blur-[120px]" />
        <div className="absolute right-[-180px] top-[-120px] h-[560px] w-[560px] rounded-full bg-sky-500/15 blur-[130px]" />
        <div className="absolute bottom-[-220px] left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-12">
        {/* header */}
        <div className="mb-8 flex items-center gap-3">
          <Badge tone="purple">Explain My Transaction</Badge>
          <span className="text-sm text-white/40">Stacks • Hiro API</span>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Turn a txid into a human explanation
        </h1>
        <p className="mt-3 max-w-2xl text-white/60">
          Paste a Stacks transaction ID and get a clean “product-style” breakdown: sender,
          recipient/target, fee, type, and events.
        </p>

        {/* input */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExplain();
            }}
            className="space-y-4"
          >
            <div className="grid gap-3 md:grid-cols-[1fr_220px_140px] items-end">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Transaction ID</label>
                <input
                  value={txid}
                  onChange={(e) => setTxid(e.target.value)}
                  placeholder="Paste a Stacks txid (64 hex)…"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
                />
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                  <span>Tip: you can paste with 0x — we handle it.</span>
                  <span className="text-white/30">•</span>
                  <span className="text-white/40">
                    Normalized: <span className="font-mono text-white/70">{normalizedTxidLabel}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Network</label>
                <select
                  value={network}
                  onChange={(e) => setNetwork(e.target.value as Network)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
                >
                  <option value="auto">Auto</option>
                  <option value="mainnet">Mainnet</option>
                  <option value="testnet">Testnet</option>
                </select>
                <p className="text-xs text-white/40">Auto tries mainnet → testnet.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-60"
              >
                {loading ? "Explaining…" : "Explain"}
              </button>
            </div>
          </form>
        </div>

        {/* error */}
        {error && (
          <div className="mt-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-rose-200">
                  {error.error || "Error"}
                </div>
                <div className="mt-1 text-sm text-rose-100/80">
                  {error.message || "Something went wrong."}
                </div>
                <div className="mt-2 text-xs text-rose-100/70">
                  Step: {error.step || "—"} • Status: {error.status ?? "—"}
                </div>
              </div>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-rose-100/80">
                Show debug
              </summary>
              <pre className="mt-3 max-h-[320px] overflow-auto rounded-2xl bg-black/40 p-4 text-xs text-rose-100/80">
{JSON.stringify(error, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* result */}
        {normalized && (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Card
              title="Transaction"
              right={<Badge tone={statusTone as any}>{normalized.status}</Badge>}
            >
              <div className="space-y-3">
                <KV
                  k="TxID"
                  v={
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono">{shortHash(normalized.txid || normalizedTxidLabel, 10, 10)}</span>
                      <CopyButton value={normalized.txid ? normalized.txid : normalizeTxid(txid)} />
                    </div>
                  }
                />
                <KV k="Type" v={<span className="capitalize">{normalized.type}</span>} />
                <KV
                  k="Fee"
                  v={
                    typeof normalized.fee === "number" ? (
                      <span className="font-mono">{formatMicroStx(normalized.fee)}</span>
                    ) : (
                      "—"
                    )
                  }
                />
                <KV k="Nonce" v={normalized.nonce ?? "—"} mono />
                <KV k="Block height" v={normalized.blockHeight ?? "—"} mono />
                <KV k="Timestamp" v={formatDate(normalized.burnBlockTime)} />
              </div>
            </Card>

            <Card title="Parties">
              <div className="space-y-3">
                <KV
                  k="Sender"
                  v={
                    normalized.sender ? (
                      <span className="font-mono">{shortHash(normalized.sender, 10, 10)}</span>
                    ) : (
                      "—"
                    )
                  }
                />
                <KV
                  k="Recipient"
                  v={
                    normalized.recipient ? (
                      <span className="font-mono">{shortHash(normalized.recipient, 10, 10)}</span>
                    ) : (
                      "—"
                    )
                  }
                />
                <KV
                  k="Contract"
                  v={
                    normalized.contractId ? (
                      <span className="font-mono">{shortHash(normalized.contractId, 14, 10)}</span>
                    ) : (
                      "—"
                    )
                  }
                />
                <KV k="Function" v={normalized.functionName ?? "—"} mono />
                <KV
                  k="Amount"
                  v={
                    typeof normalized.amountMicro === "number" ? (
                      <span className="font-mono">{formatMicroStx(normalized.amountMicro)}</span>
                    ) : (
                      <span className="text-white/40">—</span>
                    )
                  }
                />
              </div>
            </Card>

            <Card
              title="Human summary"
              right={normalized.summary ? <Badge tone="blue">AI</Badge> : <Badge>—</Badge>}
            >
              <div className="text-sm text-white/80 leading-relaxed">
                {normalized.summary ? normalized.summary : "No summary returned yet. (This is optional.)"}
              </div>
            </Card>

            <Card title="Events" right={<Badge tone="neutral">{normalized.events?.length ?? 0}</Badge>}>
              {Array.isArray(normalized.events) && normalized.events.length > 0 ? (
                <div className="space-y-3">
                  {normalized.events.slice(0, 8).map((ev: any, i: number) => {
                    const kind =
                      safeStr(ev?.event_type) ||
                      safeStr(ev?.type) ||
                      safeStr(ev?.name) ||
                      "event";
                    const amount =
                      safeStr(ev?.amount) ||
                      safeStr(ev?.value) ||
                      safeStr(ev?.asset?.amount) ||
                      undefined;
                    const asset =
                      safeStr(ev?.asset?.asset_id) ||
                      safeStr(ev?.asset_identifier) ||
                      safeStr(ev?.token) ||
                      undefined;

                    return (
                      <div
                        key={i}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white/80 capitalize">
                            {kind.replaceAll("_", " ")}
                          </div>
                          <Badge tone="neutral">#{i + 1}</Badge>
                        </div>
                        <div className="mt-2 space-y-2 text-sm text-white/70">
                          {asset && <KV k="Asset" v={<span className="font-mono">{shortHash(asset, 16, 12)}</span>} />}
                          {amount && <KV k="Amount" v={<span className="font-mono">{amount}</span>} />}
                        </div>
                      </div>
                    );
                  })}
                  {normalized.events.length > 8 && (
                    <div className="text-xs text-white/40">
                      Showing first 8 events. (API returned {normalized.events.length}.)
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-white/50">
                  No events returned for this tx (or your API doesn’t include them yet).
                </div>
              )}
            </Card>

            <div className="md:col-span-2">
              <details className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <summary className="cursor-pointer text-sm font-semibold text-white/80">
                  Raw API response (debug)
                </summary>
                <pre className="mt-4 max-h-[420px] overflow-auto rounded-2xl bg-black/40 p-4 text-xs text-white/70">
{JSON.stringify(normalized.raw, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        <div className="mt-10 text-center text-xs text-white/35">
          Built for a clean onboarding experience • “Explain My Transaction”
        </div>
      </div>
    </main>
  );
}