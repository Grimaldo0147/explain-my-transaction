"use client";

import React, { useMemo, useState } from "react";

type Network = "auto" | "mainnet" | "testnet";
type Mode = "transaction" | "wallet";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isStacksTxid(tx: string) {
  const t = (tx || "").trim();
  const s = t.startsWith("0x") ? t.slice(2) : t;
  return /^[0-9a-fA-F]{64}$/.test(s);
}

function isStacksAddress(address: string) {
  const a = (address || "").trim();
  return /^(SP|SM|ST)[A-Z0-9]{20,}$/i.test(a);
}

function extractTxid(input: string) {
  const raw = (input || "").trim();

  if (isStacksTxid(raw)) {
    const s = raw.startsWith("0x") ? raw : `0x${raw}`;
    return { txid: s.toLowerCase() };
  }

  try {
    const url = new URL(raw);
    const path = url.pathname || "";
    const parts = path.split("/").filter(Boolean);
    const idx = parts.indexOf("txid");

    if (idx !== -1 && parts[idx + 1]) {
      const maybe = parts[idx + 1];
      if (isStacksTxid(maybe)) {
        const s = maybe.startsWith("0x") ? maybe : `0x${maybe}`;
        return { txid: s.toLowerCase() };
      }
    }
  } catch {}

  const m = raw.match(/(0x)?[0-9a-fA-F]{64}/);
  if (m?.[0]) {
    const found = m[0].startsWith("0x") ? m[0] : `0x${m[0]}`;
    return { txid: found.toLowerCase() };
  }

  return { txid: "" };
}

function shortHash(s: string) {
  if (!s) return "—";
  if (s.length <= 18) return s;
  return `${s.slice(0, 10)}…${s.slice(-8)}`;
}

function shortenAddr(a: string) {
  if (!a) return "—";
  if (a.length <= 20) return a;
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

function formatKind(kind: string) {
  if (!kind) return "—";
  return kind.split("_").join(" ");
}

function safeText(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function eventLine(ev: any): string {
  if (!ev || typeof ev !== "object") return safeText(ev);

  if (ev.contractId) return safeText(ev.contractId);
  if (ev.asset) return safeText(ev.asset);

  if (ev.sender || ev.recipient) {
    return `${safeText(ev.sender || "?")} → ${safeText(ev.recipient || "?")}`;
  }

  if (ev.memoDecoded) return `Memo: ${safeText(ev.memoDecoded)}`;
  if (ev.memo) return `Memo: ${safeText(ev.memo)}`;

  const keys = Object.keys(ev);
  if (keys.length === 0) return "—";

  const preview: Record<string, any> = {};
  for (const k of keys.slice(0, 5)) {
    preview[k] = ev[k];
  }
  return safeText(preview);
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "red" | "blue" | "purple" | "amber";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-200"
      : tone === "red"
      ? "border-rose-500/25 bg-rose-500/15 text-rose-200"
      : tone === "blue"
      ? "border-sky-500/25 bg-sky-500/15 text-sky-200"
      : tone === "purple"
      ? "border-fuchsia-500/25 bg-fuchsia-500/15 text-fuchsia-200"
      : tone === "amber"
      ? "border-amber-500/25 bg-amber-500/15 text-amber-200"
      : "border-white/10 bg-white/5 text-white/70";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs", cls)}>
      {children}
    </span>
  );
}

function Card({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_20px_80px_-50px_rgba(0,0,0,1)] backdrop-blur-xl",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-sm font-semibold text-white/90">{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-white/45">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="text-xs text-white/50">{k}</div>
      <div className={cx("text-right text-sm text-white/85", mono && "font-mono text-[13px]")}>{v}</div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {}
  }

  return (
    <button
      onClick={onCopy}
      type="button"
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function renderMemoCard(rawMemo?: string, decodedMemo?: string) {
  if (!rawMemo && !decodedMemo) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-xs text-white/45">Memo</div>

      {decodedMemo ? (
        <>
          <div className="mt-2 text-sm text-white/90">{decodedMemo}</div>
          {rawMemo && rawMemo !== decodedMemo ? (
            <details className="mt-3">
              <summary className="cursor-pointer select-none text-xs text-white/45 hover:text-white/65">
                View raw hex memo
              </summary>
              <div className="mt-2 break-all font-mono text-xs text-white/60">
                {rawMemo}
              </div>
            </details>
          ) : null}
        </>
      ) : rawMemo ? (
        <>
          <div className="mt-2 text-sm text-white/70">Hex memo detected</div>
          <div className="mt-2 break-all font-mono text-xs text-white/60">{rawMemo}</div>
        </>
      ) : (
        <div className="mt-2 text-sm text-white/55">No memo</div>
      )}
    </div>
  );
}

export default function Page() {
  const [mode, setMode] = useState<Mode>("transaction");
  const [input, setInput] = useState("");
  const [network, setNetwork] = useState<Network>("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [walletResult, setWalletResult] = useState<any | null>(null);
  const [error, setError] = useState<any | null>(null);

  const extracted = useMemo(() => extractTxid(input), [input]);

  async function onExplain() {
    setError(null);
    setResult(null);
    setWalletResult(null);

    if (mode === "wallet") {
      if (!isStacksAddress(input.trim())) {
        setError({
          error: "That doesn’t look like a valid Stacks wallet address.",
          step: "validate",
          status: 400,
        });
        return;
      }

      setLoading(true);

      try {
        const fixedNetwork = network === "testnet" ? "testnet" : "mainnet";

        const res = await fetch("/api/explain-wallet", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            address: input.trim(),
            network: fixedNetwork,
          }),
        });

        const payload = await res.json();

        if (!res.ok || payload?.ok === false) {
          setError(payload);
          return;
        }

        setWalletResult(payload.data ?? payload);
      } catch (e: any) {
        setError({
          error: "Network error while explaining wallet activity.",
          step: "fetch",
          message: e?.message || "Unknown error",
          status: 0,
        });
      } finally {
        setLoading(false);
      }

      return;
    }

    const txid = extracted.txid;

    if (!txid || !isStacksTxid(txid)) {
      setError({
        error: "That doesn’t look like a valid Stacks transaction ID (64 hex characters).",
        step: "validate",
        status: 400,
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: input.trim(),
          txid,
          network,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      let payload: any;

      if (ct.includes("application/json")) {
        payload = await res.json();
      } else {
        const text = await res.text();
        payload = {
          ok: false,
          error: "Server returned non-JSON response.",
          raw: text,
          status: res.status,
        };
      }

      if (!res.ok || payload?.ok === false) {
        setError(payload);
        return;
      }

      setResult(payload.data ?? payload);
    } catch (e: any) {
      setError({
        error: "Network error while explaining transaction.",
        step: "fetch",
        message: e?.message || "Unknown error",
        status: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onExplain();
    }
  }

  async function openWalletTxInTransactionMode(txid: string, txNetwork?: string) {
  if (!txid) return;

  const nextNetwork: Network =
    txNetwork === "mainnet" || txNetwork === "testnet" ? txNetwork : "auto";

  setMode("transaction");
  setInput(txid);
  setNetwork(nextNetwork);
  setWalletResult(null);
  setResult(null);
  setError(null);
  setLoading(true);

  window.scrollTo({ top: 0, behavior: "smooth" });

  try {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: txid,
        txid,
        network: nextNetwork,
      }),
    });

    const ct = res.headers.get("content-type") || "";
    let payload: any;

    if (ct.includes("application/json")) {
      payload = await res.json();
    } else {
      const text = await res.text();
      payload = {
        ok: false,
        error: "Server returned non-JSON response.",
        raw: text,
        status: res.status,
      };
    }

    if (!res.ok || payload?.ok === false) {
      setError(payload);
      return;
    }

    setResult(payload.data ?? payload);
  } catch (e: any) {
    setError({
      error: "Network error while explaining transaction.",
      step: "fetch",
      message: e?.message || "Unknown error",
      status: 0,
    });
  } finally {
    setLoading(false);
  }
}

  const summary = result?.summary as string | undefined;
  const txid = result?.txid as string | undefined;
  const type = result?.type as string | undefined;
  const status = result?.status as string | undefined;
  const feeStx = result?.feeStx as string | number | undefined;
  const amountStx = result?.amountStx as string | number | undefined;
  const sender = result?.sender as string | undefined;
  const recipient = result?.recipientOrTarget as string | undefined;
  const contract = result?.contract as string | undefined;
  const blockHeight = result?.blockHeight as number | undefined;
  const timeIso = result?.timeIso as string | undefined;
  const networkDetected = result?.network as string | undefined;
  const eventsCount =
    result?.eventsCount ?? (Array.isArray(result?.events) ? result.events.length : 0);
  const events: any[] = Array.isArray(result?.events) ? result.events : [];
  const swapSummary = result?.swapSummary;

  const postConditionMode = result?.postConditionMode as string | undefined;
  const postConditions: any[] = Array.isArray(result?.postConditions) ? result.postConditions : [];
  const postConditionSummary = result?.postConditionSummary as any;

  const topMemo = result?.memo as string | undefined;
  const topMemoDecoded = result?.memoDecoded as string | undefined;

  const explorerUrl = txid
    ? `https://explorer.hiro.so/txid/${txid}${networkDetected === "testnet" ? "?chain=testnet" : ""}`
    : "";

  const failed =
    typeof status === "string" &&
    (status.toLowerCase().includes("fail") || status.toLowerCase().includes("abort"));

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-500/20 via-sky-500/15 to-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-120px] h-[380px] w-[380px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-200px] right-[-120px] h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-14">
        <div className="mb-6 flex items-center gap-3">
          <Badge tone="purple">Explain My Transaction</Badge>
          <span className="text-xs text-white/35">Stacks • Hiro API • Human-readable UX</span>
        </div>

        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Turn blockchain activity into
          <span className="bg-gradient-to-r from-white to-white/55 bg-clip-text text-transparent">
            {" "}
            human explanations
          </span>
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
          Explain one transaction or inspect a wallet’s recent activity in plain English.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setMode("transaction");
              setError(null);
              setWalletResult(null);
            }}
            className={cx(
              "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
              mode === "transaction"
                ? "border-white/20 bg-white text-black"
                : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08]"
            )}
          >
            Transaction
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("wallet");
              setError(null);
              setResult(null);
            }}
            className={cx(
              "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
              mode === "wallet"
                ? "border-white/20 bg-white text-black"
                : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08]"
            )}
          >
            Wallet
          </button>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px_140px] md:items-end">
            <div>
              <label className="text-xs font-semibold text-white/70">
                {mode === "transaction" ? "Transaction ID" : "Wallet Address"}
              </label>
              <div className="mt-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="w-full bg-transparent font-mono text-[13px] text-white/85 outline-none placeholder:text-white/25"
                  placeholder={
                    mode === "transaction"
                      ? "0x... or https://explorer.hiro.so/txid/0x..."
                      : "SP... wallet address"
                  }
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
                {mode === "transaction" ? (
                  <>
                    <span>Tip: paste a txid or full explorer link.</span>
                    {extracted.txid ? (
                      <>
                        <span className="text-white/20">•</span>
                        <span>Normalized:</span>
                        <span className="font-mono text-white/65">{extracted.txid}</span>
                      </>
                    ) : null}
                  </>
                ) : (
                  <span>Tip: paste a Stacks wallet address to explain recent activity.</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70">Network</label>
              <div className="mt-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-3">
                <select
                  value={network}
                  onChange={(e) => setNetwork(e.target.value as Network)}
                  className="w-full bg-transparent text-sm text-white/85 outline-none"
                >
                  <option value="auto">Auto</option>
                  <option value="mainnet">Mainnet</option>
                  <option value="testnet">Testnet</option>
                </select>
              </div>
              <div className="mt-2 text-xs text-white/35">
                {mode === "transaction"
                  ? "Auto tries mainnet → testnet."
                  : "Wallet mode uses mainnet unless testnet is selected."}
              </div>
            </div>

            <button
              onClick={onExplain}
              disabled={loading}
              type="button"
              className="h-[52px] w-full rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/60"
            >
              {loading ? "Working…" : mode === "transaction" ? "Explain" : "Explain Wallet"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/65">
            Working… building explanation.
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-3xl border border-rose-500/25 bg-rose-500/10 p-5">
            <div className="text-sm font-semibold text-rose-100">{error.error || "Something went wrong."}</div>
            <div className="mt-2 text-xs text-rose-100/80">
              {error.step ? (
                <span className="mr-2">
                  Step: <span className="font-mono">{error.step}</span>
                </span>
              ) : null}
              {typeof error.status === "number" ? (
                <span>
                  Status: <span className="font-mono">{error.status}</span>
                </span>
              ) : null}
            </div>

            {error.message || error.note || error.source ? (
              <div className="mt-3 space-y-1 text-xs text-rose-100/70">
                {error.message ? <div>Message: {error.message}</div> : null}
                {error.note ? <div>Note: {error.note}</div> : null}
                {error.source ? <div>Source: {error.source}</div> : null}
              </div>
            ) : null}

            <details className="mt-3">
              <summary className="cursor-pointer select-none text-xs text-rose-100/70">
                Show debug
              </summary>
              <pre className="mt-2 max-h-[260px] overflow-auto rounded-2xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/70">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}

        {mode === "wallet" && walletResult ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.08] via-white/[0.05] to-white/[0.03] p-6 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge tone="blue">Wallet summary</Badge>
                  <Badge tone="green">{safeText(walletResult.network)}</Badge>
                  <Badge>{safeText(walletResult.count)} activities</Badge>
                </div>
                <CopyButton text={walletResult.address} />
              </div>

              <div className="mt-4 text-lg font-semibold text-white/92">
                Recent wallet activity for {shortenAddr(walletResult.address)}
              </div>
            </div>

            <Card
              title="Wallet Activity"
              subtitle="Most recent actions in plain English"
              right={<Badge>{safeText(walletResult.count)}</Badge>}
            >
              {Array.isArray(walletResult.activities) && walletResult.activities.length > 0 ? (
                <div className="space-y-4">
                  {walletResult.activities.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-white/[0.02] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-white/90">
                            {safeText(item.action)}
                          </div>
                          <div className="mt-1 text-sm text-white/70">
                            {safeText(item.summary)}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {item.amountStx !== null && item.amountStx !== undefined ? (
                            <Badge tone="green">{safeText(item.amountStx)} STX</Badge>
                          ) : null}
                          {item.protocol ? <Badge tone="purple">{safeText(item.protocol)}</Badge> : null}
                          {item.status ? (
                            <Badge
                              tone={String(item.status).toLowerCase().includes("fail") ? "red" : "green"}
                            >
                              {safeText(item.status)}
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                          <div className="text-xs text-white/45">Transaction</div>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="font-mono text-xs text-white/75">
                              {shortHash(safeText(item.txid))}
                            </div>
                            {item.txid ? <CopyButton text={item.txid} /> : null}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                          <div className="text-xs text-white/45">Time</div>
                          <div className="mt-2 text-sm text-white/75">
                            {item.timeIso ? new Date(item.timeIso).toLocaleString() : "—"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                          <div className="text-xs text-white/45">Sender</div>
                          <div className="mt-2 font-mono text-xs text-white/75">
                            {item.sender ? shortenAddr(item.sender) : "—"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                          <div className="text-xs text-white/45">Recipient / Contract</div>
                          <div className="mt-2 font-mono text-xs text-white/75">
                            {item.recipient
                              ? shortenAddr(item.recipient)
                              : item.contract
                              ? shortenAddr(item.contract)
                              : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {item.txid ? (
                          <button
                            type="button"
                            onClick={() =>
                              openWalletTxInTransactionMode(
                                item.txid,
                                walletResult?.network
                              )
                            }
                            className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/15"
                          >
                            Explain this tx
                          </button>
                        ) : null}

                        {item.txid ? (
                          <a
                            href={`https://explorer.hiro.so/txid/${item.txid}${
                              walletResult?.network === "testnet" ? "?chain=testnet" : ""
                            }`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10"
                          >
                            Open in Hiro
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/55">
                  No recent wallet activity found.
                </div>
              )}
            </Card>
          </div>
        ) : null}

        {mode === "transaction" && summary ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.08] via-white/[0.05] to-white/[0.03] p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,1)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge tone="blue">Human summary</Badge>
                {networkDetected ? (
                  <Badge tone={networkDetected === "testnet" ? "red" : "green"}>
                    {networkDetected}
                  </Badge>
                ) : null}
                {status ? <Badge tone={failed ? "red" : "green"}>{status}</Badge> : null}
              </div>

              {txid ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white/65">{shortHash(txid)}</span>
                  <CopyButton text={txid} />
                </div>
              ) : null}
            </div>

            <div className="mt-4 text-lg font-semibold leading-relaxed text-white/92 sm:text-xl">
              {summary}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {type ? <Badge>{formatKind(type)}</Badge> : null}
              {feeStx ? <Badge>{safeText(feeStx)} STX fee</Badge> : null}
              {eventsCount !== undefined ? <Badge>{eventsCount} events</Badge> : null}
              {postConditions.length > 0 ? <Badge tone="amber">{postConditions.length} post conditions</Badge> : null}
            </div>
          </div>
        ) : null}

        {mode === "transaction" && result ? (
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card
              title="Overview"
              subtitle="High-level transaction details"
              right={
                <div className="flex items-center gap-2">
                  {networkDetected ? (
                    <Badge tone={networkDetected === "testnet" ? "red" : "green"}>
                      {networkDetected}
                    </Badge>
                  ) : null}
                  {status ? <Badge tone={failed ? "red" : "green"}>{status}</Badge> : null}
                </div>
              }
            >
              <Row
                k="TxID"
                v={
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono">{shortHash(txid || "")}</span>
                    {txid ? <CopyButton text={txid} /> : null}
                  </span>
                }
                mono
              />
              <Row k="Type" v={type ? formatKind(type) : "—"} />
              <Row k="Fee" v={feeStx ? `${safeText(feeStx)} STX` : "—"} />
              <Row k="Amount" v={amountStx ? `${safeText(amountStx)} STX` : "—"} />
              <Row k="Block" v={typeof blockHeight === "number" ? blockHeight : "—"} />
              <Row k="Time" v={timeIso ? new Date(timeIso).toLocaleString() : "—"} />
              <Row
                k="Explorer"
                v={
                  explorerUrl ? (
                    <a
                      className="text-sky-300 underline underline-offset-4 hover:text-sky-200"
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Hiro →
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </Card>

            <Card title="Parties" subtitle="Sender, target, and contract">
              <Row k="Sender" v={sender ? <span className="font-mono">{shortenAddr(sender)}</span> : "—"} mono />
              <Row
                k="Recipient / Target"
                v={recipient ? <span className="font-mono">{shortenAddr(recipient)}</span> : "—"}
                mono
              />
              <Row
                k="Contract"
                v={contract ? <span className="font-mono">{shortenAddr(contract)}</span> : "—"}
                mono
              />
            </Card>

            {(topMemo || topMemoDecoded) ? (
              <div className="lg:col-span-2">
                <Card
                  title="Memo"
                  subtitle="Transaction memo"
                  right={topMemoDecoded ? <Badge tone="green">Decoded</Badge> : <Badge tone="amber">Hex</Badge>}
                >
                  {renderMemoCard(topMemo, topMemoDecoded)}
                </Card>
              </div>
            ) : null}

            {swapSummary ? (
              <div className="lg:col-span-2">
                <Card
                  title="Swap Summary"
                  subtitle="Detected from transaction events"
                  right={<Badge tone="purple">Swap</Badge>}
                  className="bg-gradient-to-r from-fuchsia-500/[0.08] via-white/[0.04] to-emerald-500/[0.08]"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-center">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="text-xs text-white/45">Token In</div>
                      <div className="mt-2 text-sm font-semibold text-white/90">
                        {safeText(swapSummary.tokenIn?.amountStx || swapSummary.tokenIn?.amount || "—")}
                      </div>
                      <div className="mt-1 font-mono text-xs text-white/55">
                        {safeText(swapSummary.tokenIn?.asset || "—")}
                      </div>
                    </div>

                    <div className="flex items-center justify-center text-3xl text-white/65">→</div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="text-xs text-white/45">Token Out</div>
                      <div className="mt-2 text-sm font-semibold text-white/90">
                        {safeText(swapSummary.tokenOut?.amountStx || swapSummary.tokenOut?.amount || "—")}
                      </div>
                      <div className="mt-1 font-mono text-xs text-white/55">
                        {safeText(swapSummary.tokenOut?.asset || "—")}
                      </div>
                    </div>
                  </div>

                  {swapSummary.note ? (
                    <div className="mt-4 text-xs text-white/45">{safeText(swapSummary.note)}</div>
                  ) : null}
                </Card>
              </div>
            ) : null}

            {postConditionSummary || postConditions.length > 0 ? (
              <div className="lg:col-span-2">
                <Card
                  title="Post Conditions"
                  subtitle="Safety rules attached to this transaction"
                  right={
                    <div className="flex items-center gap-2">
                      {postConditionMode ? (
                        <Badge tone="amber">Mode: {safeText(postConditionMode)}</Badge>
                      ) : null}
                      {postConditions.length > 0 ? (
                        <Badge tone="amber">{postConditions.length} rules</Badge>
                      ) : null}
                    </div>
                  }
                  className="bg-gradient-to-r from-amber-500/[0.08] via-white/[0.03] to-rose-500/[0.05]"
                >
                  {postConditionSummary ? (
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold text-white/90">
                          {safeText(postConditionSummary.title || "Post conditions")}
                        </div>
                        {postConditionSummary.status ? (
                          <Badge
                            tone={String(postConditionSummary.status).toLowerCase().includes("fail") ? "red" : "amber"}
                          >
                            {safeText(postConditionSummary.status)}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-3 text-sm leading-relaxed text-white/80">
                        {safeText(postConditionSummary.summary)}
                      </div>
                    </div>
                  ) : null}

                  {postConditions.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {postConditions.map((pc, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-white/10 bg-black/25 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white/90">
                                Rule #{i + 1}
                              </div>
                              <div className="mt-1 text-sm text-white/70">
                                {safeText(pc.summary || "Post condition rule")}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {pc.type ? (
                                <Badge tone="amber">{safeText(pc.type)}</Badge>
                              ) : null}
                              {pc.amountStx ? (
                                <Badge tone="green">{safeText(pc.amountStx)} STX</Badge>
                              ) : null}
                              {!pc.amountStx && pc.amount ? (
                                <Badge tone="blue">{safeText(pc.amount)}</Badge>
                              ) : null}
                            </div>
                          </div>

                          {(pc.asset || pc.principal || pc.conditionCode || pc.tokenId) ? (
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              {pc.asset ? (
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                  <div className="text-xs text-white/45">Asset</div>
                                  <div className="mt-1 break-all font-mono text-xs text-white/75">
                                    {safeText(pc.asset)}
                                  </div>
                                </div>
                              ) : null}

                              {pc.principal ? (
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                  <div className="text-xs text-white/45">Principal</div>
                                  <div className="mt-1 break-all font-mono text-xs text-white/75">
                                    {safeText(pc.principal)}
                                  </div>
                                </div>
                              ) : null}

                              {pc.conditionCode ? (
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                  <div className="text-xs text-white/45">Condition</div>
                                  <div className="mt-1 text-xs text-white/75">
                                    {safeText(pc.conditionCode)}
                                  </div>
                                </div>
                              ) : null}

                              {pc.tokenId ? (
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                  <div className="text-xs text-white/45">Token ID</div>
                                  <div className="mt-1 break-all font-mono text-xs text-white/75">
                                    {safeText(pc.tokenId)}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <details className="mt-3">
                            <summary className="cursor-pointer select-none text-xs text-white/45 hover:text-white/65">
                              View raw rule
                            </summary>
                            <pre className="mt-2 max-h-[220px] overflow-auto rounded-2xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/70">
                              {JSON.stringify(pc, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !postConditionSummary ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-5 text-sm text-white/55">
                        No post conditions found for this transaction.
                      </div>
                    ) : null
                  )}
                </Card>
              </div>
            ) : null}

            <div className="lg:col-span-2">
              <Card
                title="Events"
                subtitle="Transfers, contract calls, and other actions"
                right={<Badge>{Array.isArray(events) ? events.length : 0}</Badge>}
              >
                {Array.isArray(events) && events.length > 0 ? (
                  <div className="space-y-4">
                    {events.slice(0, 24).map((ev, i) => {
                      const kind = String(ev?.kind || ev?.event_type || ev?.type || "event");
                      const title = formatKind(kind);
                      const amountLabel = ev?.amountStx
                        ? `${safeText(ev.amountStx)} STX`
                        : ev?.amount
                        ? safeText(ev.amount)
                        : ev?.amountMicroStx
                        ? `${safeText(ev.amountMicroStx)} microSTX`
                        : null;

                      const senderText = ev?.sender ? shortenAddr(String(ev.sender)) : null;
                      const recipientText = ev?.recipient ? shortenAddr(String(ev.recipient)) : null;
                      const assetText = ev?.asset ? safeText(ev.asset) : null;
                      const functionText = ev?.functionName ? safeText(ev.functionName) : null;
                      const memoText = ev?.memo ? safeText(ev.memo) : null;
                      const memoDecodedText = ev?.memoDecoded ? safeText(ev.memoDecoded) : null;

                      return (
                        <div
                          key={i}
                          className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-white/[0.02] p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-white/90">{title}</div>
                              <div className="mt-1 text-xs text-white/45">
                                Event #{i + 1}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {assetText ? <Badge tone="blue">{assetText}</Badge> : null}
                              {amountLabel ? <Badge tone="green">{amountLabel}</Badge> : null}
                            </div>
                          </div>

                          {(senderText || recipientText) ? (
                            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                              <div className="text-xs text-white/45">Flow</div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/85">
                                <span className="rounded-xl bg-white/5 px-3 py-1 font-mono">
                                  {senderText || "Unknown"}
                                </span>
                                <span className="text-white/40">→</span>
                                <span className="rounded-xl bg-white/5 px-3 py-1 font-mono">
                                  {recipientText || "Unknown"}
                                </span>
                              </div>
                            </div>
                          ) : null}

                          {(functionText || memoText || memoDecodedText) ? (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              {functionText ? (
                                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                                  <div className="text-xs text-white/45">Function</div>
                                  <div className="mt-2 text-sm text-white/85">{functionText}</div>
                                </div>
                              ) : null}

                              {renderMemoCard(memoText, memoDecodedText)}
                            </div>
                          ) : null}

                          {!senderText && !recipientText && !functionText && !memoText && !memoDecodedText && !amountLabel ? (
                            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/55">
                              {eventLine(ev)}
                            </div>
                          ) : null}

                          <details className="mt-4">
                            <summary className="cursor-pointer select-none text-xs text-white/45 hover:text-white/65">
                              View raw event
                            </summary>
                            <pre className="mt-2 max-h-[220px] overflow-auto rounded-2xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/70">
                              {JSON.stringify(ev, null, 2)}
                            </pre>
                          </details>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/55">
                    No events found for this transaction.
                  </div>
                )}
              </Card>
            </div>

            <div className="lg:col-span-2">
              <details className="rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-4">
                <summary className="cursor-pointer select-none text-sm font-semibold text-white/70">
                  Debug
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs font-semibold text-white/55">Client state</div>
                    <pre className="mt-2 overflow-auto text-[11px] text-white/70">
                      {JSON.stringify({ input, extracted, network, mode }, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs font-semibold text-white/55">API result</div>
                    <pre className="mt-2 max-h-[340px] overflow-auto text-[11px] text-white/70">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            </div>
          </div>
        ) : null}

        <div className="mt-16 text-center text-xs text-white/25">
          Built for clean onboarding • Explain My Transaction
        </div>
      </div>
    </main>
  );
}