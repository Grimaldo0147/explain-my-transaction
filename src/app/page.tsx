"use client";

import React, { useMemo, useState } from "react";

type Network = "auto" | "mainnet" | "testnet";

type ExplainResponse = {
  ok?: boolean;
  network?: "mainnet" | "testnet";
  txid?: string;

  // Product cards
  summary?: {
    type?: string;
    sender?: string;
    recipient?: string;
    contract?: string;
    amount?: string; // already formatted
    fee?: string; // already formatted
    status?: string;
    blockHeight?: number | string;
    timestamp?: string;
    memo?: string;
  };

  events?: Array<{
    kind?: string;
    title?: string;
    details?: string;
    amount?: string;
    asset?: string;
    from?: string;
    to?: string;
    contract?: string;
  }>;

  // errors
  error?: string;
  message?: string;
  status?: number;
  step?: string;
  source?: string;
  note?: string;
};

function clsx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function isValidHex64(s: string) {
  return /^[0-9a-fA-F]{64}$/.test(s);
}

function normalizeTxid(input: string) {
  const raw = (input || "").trim();
  const no0x = raw.toLowerCase().startsWith("0x") ? raw.slice(2) : raw;
  return no0x;
}

function shortAddr(s?: string, left = 6, right = 4) {
  if (!s) return "—";
  if (s.length <= left + right + 3) return s;
  return `${s.slice(0, left)}…${s.slice(-right)}`;
}

// Avoid replaceAll for older TS targets
function prettifyKind(kind?: string) {
  if (!kind) return "Event";
  // replaces ALL underscores using regex global
  const spaced = kind.replace(/_/g, " ");
  return spaced;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 900);
        } catch {}
      }}
      className={clsx(
        "rounded-xl px-3 py-1.5 text-xs font-semibold",
        "bg-white/10 hover:bg-white/15 active:bg-white/20",
        "border border-white/10"
      )}
      aria-label="Copy"
      title="Copy"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function StatCard({
  label,
  value,
  sub,
  right,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[0_10px_30px_-20px_rgba(0,0,0,.6)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-wide text-white/60">{label}</div>
          <div className="mt-1 text-base font-semibold text-white">{value}</div>
          {sub ? <div className="mt-1 text-xs text-white/55">{sub}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-semibold text-white/80">{title}</div>
      {subtitle ? <div className="mt-0.5 text-xs text-white/50">{subtitle}</div> : null}
    </div>
  );
}

export default function Page() {
  const [txidInput, setTxidInput] = useState("");
  const [network, setNetwork] = useState<Network>("auto");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<ExplainResponse | null>(null);

  const normalized = useMemo(() => {
    const n = normalizeTxid(txidInput);
    return n ? `0x${n}` : "";
  }, [txidInput]);

  const validationError = useMemo(() => {
    const n = normalizeTxid(txidInput);
    if (!n) return "";
    if (!isValidHex64(n)) return "That doesn’t look like a valid Stacks transaction ID (64 hex characters).";
    return "";
  }, [txidInput]);

  async function onExplain() {
    const n = normalizeTxid(txidInput);
    if (!n) {
      setRes({ error: "Please paste a transaction ID." });
      return;
    }
    if (!isValidHex64(n)) {
      setRes({ error: "That doesn’t look like a valid Stacks transaction ID (64 hex characters)." });
      return;
    }

    setLoading(true);
    setRes(null);

    try {
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txid: `0x${n}`, network }),
      });

      // handle non-json (html) safely
      const ct = r.headers.get("content-type") || "";
      let data: ExplainResponse;
      if (ct.includes("application/json")) {
        data = await r.json();
      } else {
        const raw = await r.text();
        data = {
          error: "Server error while explaining transaction.",
          message: raw.slice(0, 250),
          status: r.status,
          step: "explain",
        };
      }

      if (!r.ok) {
        setRes({
          error: data?.error || "Server error while explaining transaction.",
          message: data?.message || r.statusText,
          status: data?.status ?? r.status,
          step: data?.step || "explain",
          network: data?.network,
          source: data?.source,
          note: data?.note,
        });
      } else {
        setRes(data);
      }
    } catch (e: any) {
      setRes({
        error: "Server error while explaining transaction.",
        message: e?.message || "Unknown error",
        status: 500,
        step: "explain",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-10%] top-[-15%] h-[500px] w-[500px] rounded-full bg-fuchsia-600/20 blur-[90px]" />
        <div className="absolute right-[-10%] top-[10%] h-[520px] w-[520px] rounded-full bg-cyan-500/18 blur-[100px]" />
        <div className="absolute left-[20%] bottom-[-25%] h-[620px] w-[620px] rounded-full bg-emerald-500/12 blur-[110px]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/70">
            Explain My Transaction
          </div>
          <div className="text-xs text-white/40">Stacks • Hiro API</div>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Turn a txid into a <span className="text-white/80">human explanation</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/55">
          Paste a Stacks transaction ID and get a clean “product-style” breakdown: sender, recipient/target, fee, type,
          and events.
        </p>

        {/* Input Card */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_80px_-60px_rgba(0,0,0,.8)]">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
            <div>
              <label className="text-xs font-semibold text-white/70">Transaction ID</label>
              <input
                value={txidInput}
                onChange={(e) => setTxidInput(e.target.value)}
                placeholder="0x… (64 hex chars)"
                className={clsx(
                  "mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none",
                  "bg-black/35 border-white/10 text-white placeholder:text-white/25",
                  "focus:border-white/25 focus:ring-2 focus:ring-white/10"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onExplain();
                }}
              />
              <div className="mt-2 text-xs text-white/45">
                Tip: you can paste with <span className="font-semibold text-white/60">0x</span> — we handle it.
              </div>
              {normalized ? (
                <div className="mt-1 text-xs text-white/35">
                  Normalized: <span className="font-mono">{normalized}</span>
                </div>
              ) : null}
              {validationError ? (
                <div className="mt-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {validationError}
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70">Network</label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value as Network)}
                className={clsx(
                  "mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none",
                  "bg-black/35 border-white/10 text-white",
                  "focus:border-white/25 focus:ring-2 focus:ring-white/10"
                )}
              >
                <option value="auto">Auto</option>
                <option value="mainnet">Mainnet</option>
                <option value="testnet">Testnet</option>
              </select>
              <div className="mt-2 text-xs text-white/40">Auto tries mainnet → testnet.</div>
            </div>

            <button
              type="button"
              onClick={onExplain}
              disabled={loading}
              className={clsx(
                "h-[46px] rounded-2xl px-6 text-sm font-semibold",
                "bg-white text-black hover:bg-white/90 active:bg-white/80",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {loading ? "Explaining…" : "Explain"}
            </button>
          </div>
        </div>

        {/* Error */}
        {res?.error ? (
          <div className="mt-6 rounded-3xl border border-rose-500/25 bg-rose-500/10 p-5">
            <div className="text-sm font-semibold text-rose-100">{res.error}</div>
            <div className="mt-2 text-xs text-rose-100/70">
              {res.step ? (
                <>
                  Step: <span className="font-mono">{res.step}</span> •{" "}
                </>
              ) : null}
              {typeof res.status !== "undefined" ? (
                <>
                  Status: <span className="font-mono">{res.status}</span>
                </>
              ) : null}
            </div>
            {res.message ? <div className="mt-2 text-xs text-rose-100/80">{res.message}</div> : null}
            {res.source ? (
              <div className="mt-3 text-xs text-rose-100/70">
                Source: <span className="font-mono break-all">{res.source}</span>
              </div>
            ) : null}
            {res.note ? <div className="mt-2 text-xs text-rose-100/60">{res.note}</div> : null}
          </div>
        ) : null}

        {/* Results */}
        {res && !res.error ? (
          <div className="mt-8 space-y-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-white/50">Transaction</div>
                <div className="mt-1 flex items-center gap-3">
                  <div className="font-mono text-sm text-white">{res.txid || normalized || "—"}</div>
                  {res.txid ? <CopyButton value={res.txid} /> : normalized ? <CopyButton value={normalized} /> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/70">
                Network: <span className="font-semibold text-white/85">{res.network || "—"}</span>
              </div>
            </div>

            <div>
              <SectionTitle title="Overview" subtitle="High-level transaction details" />
              <div className="grid gap-4 md:grid-cols-2">
                <StatCard
                  label="Type"
                  value={res.summary?.type || "—"}
                  sub={res.summary?.status ? `Status: ${res.summary.status}` : undefined}
                />
                <StatCard
                  label="Fee"
                  value={res.summary?.fee || "—"}
                  sub={res.summary?.blockHeight ? `Block: ${res.summary.blockHeight}` : undefined}
                />
                <StatCard
                  label="Sender"
                  value={<span className="font-mono">{res.summary?.sender || "—"}</span>}
                  sub={res.summary?.sender ? shortAddr(res.summary.sender) : undefined}
                  right={res.summary?.sender ? <CopyButton value={res.summary.sender} /> : undefined}
                />
                <StatCard
                  label="Recipient / Target"
                  value={<span className="font-mono">{res.summary?.recipient || res.summary?.contract || "—"}</span>}
                  sub={
                    res.summary?.recipient
                      ? shortAddr(res.summary.recipient)
                      : res.summary?.contract
                      ? shortAddr(res.summary.contract)
                      : undefined
                  }
                  right={
                    res.summary?.recipient ? (
                      <CopyButton value={res.summary.recipient} />
                    ) : res.summary?.contract ? (
                      <CopyButton value={res.summary.contract} />
                    ) : undefined
                  }
                />
              </div>

              {(res.summary?.amount || res.summary?.memo || res.summary?.timestamp) && (
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <StatCard label="Amount" value={res.summary?.amount || "—"} />
                  <StatCard label="Timestamp" value={res.summary?.timestamp || "—"} />
                  <StatCard label="Memo" value={res.summary?.memo || "—"} />
                </div>
              )}
            </div>

            <div>
              <SectionTitle title="Events" subtitle="Transfers, contract calls, and other actions" />
              {res.events && res.events.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {res.events.map((e, i) => {
                    const kind = e.kind || "event";
                    const title = e.title || prettifyKind(kind);
                    const subtitle =
                      e.details ||
                      (e.from || e.to
                        ? `${e.from ? `From ${shortAddr(e.from)}` : ""}${e.from && e.to ? " → " : ""}${
                            e.to ? `To ${shortAddr(e.to)}` : ""
                          }`
                        : e.contract
                        ? `Contract: ${shortAddr(e.contract, 10, 6)}`
                        : "");

                    return (
                      <div
                        key={`${kind}-${i}`}
                        className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white/90">{title}</div>
                            {subtitle ? <div className="mt-1 text-xs text-white/55">{subtitle}</div> : null}
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                            #{i + 1}
                          </div>
                        </div>

                        {(e.amount || e.asset || e.from || e.to || e.contract) && (
                          <div className="mt-3 grid gap-2 text-xs text-white/60">
                            {e.amount ? (
                              <div>
                                <span className="text-white/40">Amount:</span>{" "}
                                <span className="font-semibold text-white/80">{e.amount}</span>
                              </div>
                            ) : null}
                            {e.asset ? (
                              <div>
                                <span className="text-white/40">Asset:</span>{" "}
                                <span className="font-mono text-white/75">{e.asset}</span>
                              </div>
                            ) : null}
                            {e.from ? (
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <span className="text-white/40">From:</span>{" "}
                                  <span className="font-mono text-white/75">{e.from}</span>
                                </div>
                                <CopyButton value={e.from} />
                              </div>
                            ) : null}
                            {e.to ? (
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <span className="text-white/40">To:</span>{" "}
                                  <span className="font-mono text-white/75">{e.to}</span>
                                </div>
                                <CopyButton value={e.to} />
                              </div>
                            ) : null}
                            {e.contract ? (
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <span className="text-white/40">Contract:</span>{" "}
                                  <span className="font-mono text-white/75">{e.contract}</span>
                                </div>
                                <CopyButton value={e.contract} />
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-white/60">
                  No events found for this transaction (or the API response didn’t include events).
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-12 text-center text-xs text-white/30">
          Built for a clean onboarding experience • “Explain My Transaction”
        </div>
      </div>
    </main>
  );
}