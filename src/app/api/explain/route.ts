// src/app/api/explain/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  normalizeTxid,
  isValidStacksTxidHex,
  parseStacksTransaction,
  resolveNetworkAndFetchTx,
  type Network,
} from "@/utils/parseStacksTx";
import { explainTransaction } from "@/features/explain-transaction/explainTx";

type Body = {
  txid?: string;
  network?: Network | "auto";
};

function jsonError(status: number, payload: Record<string, any>) {
  return NextResponse.json(payload, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const txidInput = String(body?.txid ?? "");
    const network = (body?.network ?? "auto") as Body["network"];

    const { normalized, with0x } = normalizeTxid(txidInput);

    if (!isValidStacksTxidHex(normalized)) {
      return jsonError(400, {
        error: "Invalid txid",
        step: "validate",
        message:
          "That doesn’t look like a valid Stacks transaction ID (64 hex characters).",
        txid: txidInput,
      });
    }

    const fetched =
      network === "mainnet" || network === "testnet"
        ? await parseStacksTransaction({ txid: with0x, network })
        : await resolveNetworkAndFetchTx(with0x);

    const explained = explainTransaction({
      network: fetched.network,
      txid: fetched.txid,
      tx: fetched.tx,
      events: fetched.events,
    });

    return NextResponse.json(explained, { status: 200 });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;

    // Prevent HTML pages from becoming "message"
    const msg =
      typeof e?.message === "string" && e.message.includes("<!DOCTYPE html")
        ? "Server returned HTML instead of JSON (check your fetch URL / runtime error)."
        : e?.message || "Unknown error";

    return jsonError(status, {
      error: "Server error while explaining transaction.",
      step: e?.step || "explain",
      message: msg,
      status,
      source: e?.url || null,
      note:
        status === 404
          ? "Transaction not found on this network."
          : "Check server logs for details.",
    });
  }
}