// src/app/api/explain/route.ts

import { NextRequest, NextResponse } from "next/server";
import { explainTransaction } from "@/features/explain-transaction/explainTx";
import {
  normalizeStacksTxid,
  resolveNetworkAndFetchTx,
  type NetworkMode,
} from "@/utils/parseStacksTx";

async function tryFetchEvents(txid: string, network: "mainnet" | "testnet") {
  // Best-effort: events endpoint may vary by deployment; we won't fail the request if this fails.
  const base = network === "mainnet" ? "https://api.hiro.so" : "https://api.testnet.hiro.so";
  const url = `${base}/extended/v1/tx/events?tx_id=${encodeURIComponent(txid)}&limit=50&offset=0`;

  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return { url, events: null as any };
    const data = await res.json();
    // Hiro often returns { limit, offset, total, events: [...] } or { results: [...] }
    const events = Array.isArray(data?.events) ? data.events : Array.isArray(data?.results) ? data.results : null;
    return { url, events };
  } catch {
    return { url, events: null as any };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const txidInput = String(body?.txid ?? "");
    const networkMode = (body?.network ?? "auto") as NetworkMode;

    const norm = normalizeStacksTxid(txidInput);
    if (!norm.isValid) {
      return NextResponse.json(
        { error: norm.reason, step: "validate", status: 400 },
        { status: 400 }
      );
    }

    const txid = norm.normalized;

    const fetched = await resolveNetworkAndFetchTx(txid, networkMode);

    if (!fetched.ok) {
      // Give a helpful message (common cause: user pasted Bitcoin txid, or wrong network)
      return NextResponse.json(
        {
          error: "Transaction not found on Hiro Stacks API.",
          step: "fetch-tx",
          status: fetched.status,
          normalized: txid,
          networkTried: fetched.tried,
          hint:
            "Make sure this is a *Stacks* txid. If you copied it from a Bitcoin explorer, it won’t exist on Stacks.",
        },
        { status: 404 }
      );
    }

    // Optional events (best-effort)
    const ev = await tryFetchEvents(txid, fetched.network);
    const explanation = explainTransaction(fetched.data, ev.events);

    return NextResponse.json(
      {
        ok: true,
        normalized: txid,
        networkUsed: fetched.network,
        source: fetched.url,
        eventsSource: ev.url,
        tx: fetched.data,
        explanation,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Server error while explaining transaction.",
        step: "server",
        message: e?.message || "Unknown error",
        status: 500,
      },
      { status: 500 }
    );
  }
}