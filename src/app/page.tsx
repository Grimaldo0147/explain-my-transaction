"use client";

import React, { useMemo, useState } from "react";

type ApiEvent = {
  type: string;
  asset: string | null;
  amount: string | null;
  sender: string | null;
  recipient: string | null;
  senderShort: string | null;
  recipientShort: string | null;
  raw: any;
};

type ApiResponse = {
  ok?: boolean;
  network?: "mainnet" | "testnet";
  txid?: string;
  overview?: {
    txid: string;
    network: string;
    status: string;
    type: string;
    sender: string | null;
    recipient: string | null;
    feeMicroStx: string | number | null;
    feeStx: string | null;
    block_height: number | null;
    burn_block_height: number | null;
    timestamp: string | number | null;
    canonical: boolean | null;
  };
  cards?: Record<
    string,
    { title: string; value: string | null; valueShort?: string | null; microStx?: string | null }
  >;
  details?: any;
  events?: ApiEvent[];
  error?: string;
  step?: string;
  message?: string;
  status?: number;
};

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function prettyNetwork(n?: string) {
  if (!n) return "—";
  return n === "mainnet" ? "Mainnet" : n === "testnet" ? "Testnet" : n;
}

function badgeColor(kind: "good" | "warn" | "bad" | "neutral") {
  if (kind === "good") return "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30";
  if (kind === "warn") return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
  if (kind === "bad") return "bg-rose-500/15 text-rose-200 ring-rose-500/30";
  return "bg-white/10 text-white/80 ring-white/15";
}

function statusKind(s?: string) {
  const v = (s || "").toLowerCase();
  if (v.includes("success")) return "good";
  if (v.includes("pending")) return "warn";
  if (v.includes("abort") || v.includes("fail") || v.includes("drop")) return "bad";
  return "neutral";
}

function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value?: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="text-xs font-medium text-white/60">{title}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value ?? "—"}</div>
      {sub ? <div className="mt-2 text-xs text-white/50">{sub}</div> : null}
    </div>
  );
}

export default function Page() {
  const [txid, setTxid] = useState(
    "0x41e21f993c03461aa1856b9cedb15d75ea78d6a26472f031add7a4fd785d9177"
  );
  const [network, setNetwork] = useState<"auto" | "mainnet" | "testnet">("auto");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);

  const normalized = useMemo(() => {
    const t = (txid || "").trim();
    const no0x = t.toLowerCase().startsWith("0x") ? t.slice(2) : t;
    return `0x${no0x.toLowerCase()}`;
  }, [txid]);

  async function onExplain() {
    setLoading(true);
    setData(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ txid, network }),
      });

      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch (e: any) {
      setData({
        error: "Client error",
        step: "fetch",
        message: e?.message || "Unknown error",
        status: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  const overview = data?.overview;
  const events = data?.events || [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-500/15 via-cyan-500/10 to-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-[-200px] left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 py-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/15">
              Explain My Transaction
            </span>
            <span className="text-xs text-white/40">Stacks • Hiro API</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Turn a txid into a human explanation
          </h1>
          <p className="max-w-2xl text-sm text-white/60">
            Paste a Stacks transaction ID and get a clean “product-style” breakdown:
            sender, recipient/target, fee, type, and events.
          </p>
        </div>

        {/* Input bar */}
        <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-medium text-white/60">
                Transaction ID
              </label>
              <input
                value={txid}
                onChange={(e) => setTxid(e.target.value)}
                placeholder="0x… (64 hex chars)"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-white/20"
              />
              <div className="mt-2 text-xs text-white/40">
                Tip: you can paste with <span className="text-white/70">0x</span> — we handle it.
                <div className="mt-1">
                  Normalized: <span className="font-mono text-white/70">{normalized}</span>
                </div>
              </div>
            </div>

            <div className="sm:w-44">
              <label className="mb-2 block text-xs font-medium text-white/60">
                Network
              </label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value as any)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-white/20"
              >
                <option value="auto">Auto</option>
                <option value="mainnet">Mainnet</option>
                <option value="testnet">Testnet</option>
              </select>
              <div className="mt-2 text-xs text-white/40">Auto tries mainnet → testnet.</div>
            </div>

            <button
              onClick={onExplain}
              disabled={loading}
              className={classNames(
                "rounded-2xl px-5 py-3 text-sm font-semibold",
                "border border-white/10 bg-white text-black",
                "hover:bg-white/90 active:bg-white/80",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {loading ? "Explaining…" : "Explain"}
            </button>
          </div>
        </div>

        {/* Error */}
        {data?.error ? (
          <div className="mt-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4">
            <div className="text-sm font-semibold text-rose-200">
              {data.error}
            </div>
            <div className="mt-2 text-xs text-rose-200/80">
              Step: <span className="font-mono">{data.step}</span> • Status:{" "}
              <span className="font-mono">{data.status}</span>
            </div>
            <div className="mt-2 text-sm text-rose-100/90">{data.message}</div>
          </div>
        ) : null}

        {/* Result */}
        {overview ? (
          <div className="mt-8 space-y-6">
            {/* Top summary */}
            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={classNames(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      badgeColor(statusKind(overview.status) as any)
                    )}
                  >
                    {overview.status}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/15">
                    {overview.type}
                  </span>
                  <span className="text-xs text-white/50">
                    {prettyNetwork(overview.network)}
                  </span>
                </div>

                <div className="text-xs text-white/50">
                  {overview.block_height != null ? (
                    <span>Block: {overview.block_height}</span>
                  ) : (
                    <span>Block: —</span>
                  )}
                  <span className="mx-2">•</span>
                  <span>
                    Fee: {overview.feeStx ? `${overview.feeStx} STX` : "—"}
                  </span>
                </div>
              </div>

              <div className="mt-2 rounded-2xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-white/80">
                {overview.txid}
              </div>

              {overview.timestamp ? (
                <div className="text-xs text-white/50">
                  Timestamp:{" "}
                  <span className="text-white/70">{String(overview.timestamp)}</span>
                </div>
              ) : null}
            </div>

            {/* Product cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Card
                title="Sender"
                value={overview.sender ?? "—"}
                sub={overview.sender ? "Origin address" : null}
              />
              <Card
                title="Recipient / Target"
                value={overview.recipient ?? "—"}
                sub={overview.type === "contract_call" ? "Contract ID" : null}
              />
              <Card
                title="Fee"
                value={overview.feeStx ? `${overview.feeStx} STX` : "—"}
                sub={
                  overview.feeMicroStx != null
                    ? `microSTX: ${String(overview.feeMicroStx)}`
                    : null
                }
              />
              <Card title="Type" value={overview.type} />
              <Card title="Status" value={overview.status} />
              <Card
                title="Network"
                value={prettyNetwork(overview.network)}
                sub="Detected by API"
              />
            </div>

            {/* Events */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Events</div>
                  <div className="text-xs text-white/50">
                    Showing up to {events.length} event(s)
                  </div>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 ring-1 ring-white/15">
                  {events.length}
                </span>
              </div>

              {events.length === 0 ? (
                <div className="mt-4 text-sm text-white/60">
                  No events returned for this transaction (or none available).
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {events.slice(0, 12).map((ev, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/15">
                            {ev.type}
                          </span>
                          {ev.asset ? (
                            <span className="text-xs text-white/60">
                              {ev.asset}
                            </span>
                          ) : null}
                        </div>
                        {ev.amount ? (
                          <div className="text-xs font-semibold text-white/80">
                            Amount: <span className="font-mono">{ev.amount}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-white/60 sm:grid-cols-2">
                        <div>
                          <div className="text-white/50">Sender</div>
                          <div className="font-mono text-white/80">
                            {ev.sender ?? "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-white/50">Recipient</div>
                          <div className="font-mono text-white/80">
                            {ev.recipient ?? "—"}
                          </div>
                        </div>
                      </div>

                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-white/50 hover:text-white/70">
                          Show raw
                        </summary>
                        <pre className="mt-2 max-h-60 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/70">
                          {JSON.stringify(ev.raw, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-white/35">
          Built for a clean onboarding experience • “Explain My Transaction”
        </div>
      </div>
    </div>
  );
}