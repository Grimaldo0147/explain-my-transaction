"use client";

import * as React from "react";

type Network = "mainnet" | "testnet";

type Explained = {
  summary?: string;
  txType?: string;
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
  raw?: any;
};

type ApiOk = {
  ok: true;
  network?: Network;
  apiBase?: string;
  txid?: string;
  explained?: Explained;
  explanation?: Explained; // fallback if your API uses different name
  parsedTx?: any; // fallback
  tx?: any; // minimal tx or full tx
  // allow any
  [key: string]: any;
};

type ApiErr = {
  ok?: false;
  error?: string;
  message?: string;
  step?: string;
  status?: number;
  networkChecked?: string;
  source?: string;
  raw?: string;
  stack?: string;
  debug?: any;
  [key: string]: any;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeTxid(input: string) {
  const trimmed = (input || "").trim();
  const no0x = trimmed.toLowerCase().startsWith("0x") ? trimmed.slice(2) : trimmed;
  const hex = no0x.toLowerCase();
  return { trimmed, hex, with0x: `0x${hex}` };
}

function isValidTxidHex64(hex: string) {
  return /^[0-9a-f]{64}$/.test(hex);
}

function shortAddr(addr?: string) {
  if (!addr) return "";
  if (addr.length <= 18) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function formatAmountMicroStx(amount?: string) {
  if (!amount) return "";
  // Best-effort: if it's numeric, show STX as well
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  const stx = n / 1_000_000;
  // Keep it readable
  const stxPretty =
    stx >= 1 ? stx.toLocaleString(undefined, { maximumFractionDigits: 6 }) : stx.toFixed(6);
  return `${amount} µSTX  •  ${stxPretty} STX`;
}

async function safeParseResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return { kind: "json" as const, data: await res.json() };
  }
  const text = await res.text();
  return { kind: "text" as const, data: text };
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const toneCls =
    tone === "good"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : tone === "bad"
      ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
      : tone === "warn"
      ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
      : "border-white/10 bg-white/5 text-zinc-200";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium", toneCls)}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
      aria-hidden="true"
    />
  );
}

function InfoCard({
  label,
  value,
  mono,
  copyValue,
}: {
  label: string;
  value?: string | number;
  mono?: boolean;
  copyValue?: string;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/50">{label}</div>
          <div className={cn("mt-1 break-all text-sm text-white/90", mono && "font-mono")}>
            {String(value)}
          </div>
        </div>

        {copyValue ? (
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(copyValue)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10"
            title="Copy"
          >
            Copy
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function prettyJson(value: any) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function Page() {
  const [txidInput, setTxidInput] = React.useState("");
  const [network, setNetwork] = React.useState<Network>("mainnet");
  const [isLoading, setIsLoading] = React.useState(false);

  const [validationError, setValidationError] = React.useState<string>("");
  const [normalized, setNormalized] = React.useState<string>("");

  const [ok, setOk] = React.useState<ApiOk | null>(null);
  const [err, setErr] = React.useState<ApiErr | null>(null);
  const [showDebug, setShowDebug] = React.useState(false);
  const [rawText, setRawText] = React.useState<string>("");

  React.useEffect(() => {
    const { hex, with0x } = normalizeTxid(txidInput);
    if (!txidInput.trim()) {
      setNormalized("");
      setValidationError("");
      return;
    }
    setNormalized(with0x);

    if (!isValidTxidHex64(hex)) {
      setValidationError("That doesn’t look like a valid Stacks transaction ID (64 hex characters).");
    } else {
      setValidationError("");
    }
  }, [txidInput]);

  const canExplain = !isLoading && txidInput.trim().length > 0 && !validationError;

  async function onExplain() {
    setOk(null);
    setErr(null);
    setRawText("");
    setShowDebug(false);

    const { hex, with0x } = normalizeTxid(txidInput);
    if (!isValidTxidHex64(hex)) {
      setValidationError("That doesn’t look like a valid Stacks transaction ID (64 hex characters).");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txid: with0x, network }),
      });

      const parsed = await safeParseResponse(res);

      if (parsed.kind === "text") {
        setErr({
          ok: false,
          error: "Server returned a non-JSON response.",
          step: "server",
          status: res.status,
          message: "This usually means your API crashed and Next returned an HTML error page.",
          raw: String(parsed.data),
        });
        setRawText(String(parsed.data).slice(0, 4000));
        setShowDebug(true);
        return;
      }

      const payload = parsed.data as any;

      if (!res.ok || payload?.ok === false) {
        setErr({
          ok: false,
          error: payload?.error || "Request failed.",
          message: payload?.message,
          step: payload?.step,
          status: payload?.status ?? res.status,
          networkChecked: payload?.networkChecked,
          source: payload?.source,
          stack: payload?.stack,
          debug: payload?.debug,
          raw: payload?.raw,
        });
        setShowDebug(true);
        return;
      }

      setOk(payload as ApiOk);
    } catch (e: any) {
      setErr({
        ok: false,
        error: "Network error.",
        step: "fetch",
        status: 0,
        message: e?.message || "Failed to reach server.",
      });
      setShowDebug(true);
    } finally {
      setIsLoading(false);
    }
  }

  // Pull explained data from multiple possible shapes
  const explained: Explained | undefined =
    ok?.explained || ok?.explanation || ok?.data?.explained || ok?.data?.explanation;

  // If your API returns tx events, try common locations
  const events: any[] =
    (ok?.events as any[]) ||
    (ok?.tx?.events as any[]) ||
    (ok?.data?.events as any[]) ||
    (ok?.data?.tx?.events as any[]) ||
    [];

  const txType = explained?.txType || ok?.tx?.tx_type || ok?.data?.tx_type;
  const status = explained?.status || ok?.tx?.tx_status || ok?.data?.tx_status;

  const statusTone =
    String(status || "").toLowerCase() === "success" ? "good" : status ? "warn" : "neutral";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-black to-zinc-950 text-white">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.65))]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-14 md:pt-20">
        {/* Header */}
        <header className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-200 backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.55)]" />
            Stacks tx → human-readable breakdown
          </div>

          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            Explain{" "}
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              My Transaction
            </span>
          </h1>

          <p className="max-w-2xl text-balance text-sm text-zinc-300 md:text-base">
            Paste a Stacks transaction ID and get a clean summary, key fields, and events — with raw debug when needed.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Badge>Fast</Badge>
            <Badge>Grant-ready</Badge>
            <Badge>Debug-friendly</Badge>
          </div>
        </header>

        {/* Input */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)] md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Transaction ID</h2>
                <span className="text-xs text-zinc-400">(txid)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNetwork("mainnet")}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    network === "mainnet"
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/5"
                  )}
                >
                  Mainnet
                </button>
                <button
                  type="button"
                  onClick={() => setNetwork("testnet")}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    network === "testnet"
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/5"
                  )}
                >
                  Testnet
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex-1">
                <input
                  value={txidInput}
                  onChange={(e) => setTxidInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onExplain()}
                  placeholder="Paste txid (with or without 0x)…"
                  spellCheck={false}
                  className={cn(
                    "w-full rounded-xl border bg-black/30 px-4 py-4 font-mono text-sm outline-none transition",
                    "border-white/10 placeholder:text-zinc-500 focus:border-white/25 focus:bg-black/40",
                    validationError ? "border-rose-400/30 focus:border-rose-300/40" : ""
                  )}
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                  <span>Tip: paste with 0x — we normalize it automatically.</span>
                  {normalized ? (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(normalized)}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-200 hover:bg-white/10"
                      title="Copy normalized txid"
                    >
                      Copy normalized
                    </button>
                  ) : (
                    <span />
                  )}
                </div>

                {normalized ? (
                  <p className="mt-2 text-xs text-zinc-400">
                    Normalized: <span className="font-mono text-zinc-200">{normalized}</span>
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onExplain}
                disabled={!canExplain}
                className={cn(
                  "group relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-4 font-semibold transition",
                  "bg-white text-black hover:shadow-[0_0_35px_rgba(255,255,255,0.25)]",
                  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"
                )}
              >
                {isLoading ? <Spinner /> : null}
                <span>{isLoading ? "Explaining…" : "Explain"}</span>
                <span className="absolute inset-0 rounded-xl opacity-0 transition group-hover:opacity-100 [background:radial-gradient(80%_80%_at_50%_0%,rgba(255,255,255,0.25),transparent_60%)]" />
              </button>
            </div>

            {validationError ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                <div className="font-semibold">Invalid txid</div>
                <div className="mt-1 text-rose-100/90">{validationError}</div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Error */}
        {err ? (
          <section className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-5 backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-rose-100">{err.error || "Error"}</h3>
                <p className="mt-1 text-sm text-rose-100/80">{err.message || "Open debug for details."}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge tone="bad">Status: {err.status ?? 500}</Badge>
                {err.step ? <Badge tone="warn">Step: {err.step}</Badge> : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDebug((s) => !s)}
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-rose-100 hover:bg-white/10"
            >
              <span className="select-none">{showDebug ? "Hide debug" : "Show debug"}</span>
              <span className={cn("transition", showDebug ? "rotate-180" : "")}>▾</span>
            </button>

            {showDebug ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-4">
                <pre className="max-h-[420px] overflow-auto text-xs leading-relaxed text-zinc-100">
{prettyJson({
  ...err,
  raw: err.raw ? String(err.raw).slice(0, 2000) : undefined,
  rawText: rawText ? rawText.slice(0, 2000) : undefined,
})}
                </pre>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* PRODUCT RESULTS */}
        {ok ? (
          <section className="grid gap-4">
            {/* Header chips */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="good">OK</Badge>
                <Badge>Network: {(ok.network as any) || network}</Badge>
                {txType ? <Badge>Type: {String(txType)}</Badge> : null}
                {status ? <Badge tone={statusTone as any}>Status: {String(status)}</Badge> : null}
              </div>

              {ok.apiBase ? (
                <span className="text-xs text-white/50">API: {ok.apiBase}</span>
              ) : null}
            </div>

            {/* Summary */}
            <SectionCard title="Summary">
              <div className="text-xl font-semibold leading-snug">
                {explained?.summary || "No summary returned yet."}
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                {ok.txid ? (
                  <button
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
                    onClick={() => navigator.clipboard?.writeText(ok.txid as string)}
                    title="Copy txid"
                  >
                    Copy txid
                  </button>
                ) : null}
                {normalized ? (
                  <button
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
                    onClick={() => navigator.clipboard?.writeText(normalized)}
                    title="Copy normalized"
                  >
                    Copy normalized
                  </button>
                ) : null}
              </div>
            </SectionCard>

            {/* Key details grid */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoCard label="Sender" value={explained?.sender ? shortAddr(explained.sender) : undefined} mono copyValue={explained?.sender} />
              <InfoCard label="Recipient" value={explained?.recipient ? shortAddr(explained.recipient) : undefined} mono copyValue={explained?.recipient} />

              <InfoCard
                label="Amount"
                value={
                  explained?.amount
                    ? formatAmountMicroStx(explained.amount)
                    : undefined
                }
              />

              <InfoCard label="Fee rate" value={explained?.feeRate} mono />
              <InfoCard label="Nonce" value={explained?.nonce} />
              <InfoCard label="Block height" value={explained?.blockHeight} />
              <InfoCard label="Block time" value={explained?.blockTime} mono />

              <InfoCard label="Contract" value={explained?.contractId} mono copyValue={explained?.contractId} />
              <InfoCard label="Function" value={explained?.functionName} mono />
              <InfoCard label="Memo" value={explained?.memo} />
            </div>

            {/* Events */}
            <SectionCard title={`Events ${events?.length ? `(${events.length})` : ""}`}>
              {Array.isArray(events) && events.length > 0 ? (
                <div className="space-y-3">
                  {events.slice(0, 30).map((ev, idx) => {
                    const type = ev?.event_type || ev?.type || "event";
                    const contract = ev?.contract_id || ev?.asset?.contract_id || ev?.contract || "";
                    const amount = ev?.amount || ev?.value || ev?.stx_amount || "";
                    const sender = ev?.sender || ev?.sender_address || "";
                    const recipient = ev?.recipient || ev?.recipient_address || "";

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-white/10 bg-black/30 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge>{String(type)}</Badge>
                            {contract ? (
                              <span className="font-mono text-xs text-white/60">
                                {contract}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-xs text-white/40">#{idx + 1}</span>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                          {sender ? <InfoRow k="Sender" v={sender} /> : null}
                          {recipient ? <InfoRow k="Recipient" v={recipient} /> : null}
                          {amount ? <InfoRow k="Amount" v={String(amount)} /> : null}
                        </div>

                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs text-white/60 hover:text-white/80">
                            Raw event
                          </summary>
                          <pre className="mt-2 max-h-[260px] overflow-auto rounded-xl border border-white/10 bg-black/35 p-3 text-xs text-white/75">
{prettyJson(ev)}
                          </pre>
                        </details>
                      </div>
                    );
                  })}
                  {events.length > 30 ? (
                    <div className="text-xs text-white/50">
                      Showing first 30 events. (You can increase this limit in code.)
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-white/60">
                  No events returned by the API yet.
                  <div className="mt-2 text-xs text-white/45">
                    Tip: If you want Events, update your API route to return `tx.events` from Hiro’s tx endpoint.
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Raw drawer */}
            <details className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <summary className="cursor-pointer text-sm text-white/70 hover:text-white/90">
                Raw response (debug)
              </summary>
              <pre className="mt-4 max-h-[520px] overflow-auto rounded-xl border border-white/10 bg-black/35 p-4 text-xs text-white/75">
{prettyJson(ok)}
              </pre>
            </details>
          </section>
        ) : null}

        {/* Footer */}
        <footer className="pt-2 text-center text-xs text-zinc-500">
          Built for Stacks • product UI + debug drawer.
        </footer>
      </main>

      {/* Grain */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Cfilter id=%22n%22 x=%220%22 y=%220%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22300%22 height=%22300%22 filter=%22url(%23n)%22 opacity=%220.6%22/%3E%3C/svg%3E')] mix-blend-overlay" />
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-[11px] uppercase tracking-wider text-white/50">{k}</div>
      <div className="mt-1 break-all font-mono text-xs text-white/80">{v}</div>
    </div>
  );
}
