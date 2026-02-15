// src/app/api/explain/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  normalizeTxid,
  isValidTxid,
  resolveNetworkAndFetchTx,
  serializeError,
  type StacksNetwork,
} from "@/utils/parseStacksTx";
import { explainTransaction } from "@/features/explain-transaction/explainTx";

/**
 * POST /api/explain
 * body: { txid: string, network?: "mainnet" | "testnet" }
 */
export async function POST(req: NextRequest) {
  const step = (s: string) => s;

  try {
    const body = await req.json().catch(() => ({} as any));
    const inputTxid = String(body?.txid || "");
    const preferredNetwork: StacksNetwork | undefined =
      body?.network === "mainnet" || body?.network === "testnet"
        ? body.network
        : undefined;

    const txid = normalizeTxid(inputTxid);

    if (!isValidTxid(txid)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "That doesn’t look like a valid Stacks transaction ID (64 hex characters).",
          step: step("validate"),
          txid,
        },
        { status: 400 }
      );
    }

    // Fetch tx JSON (try mainnet then testnet unless user picked one)
    const { network, apiBase, tx } = await resolveNetworkAndFetchTx(
      txid,
      preferredNetwork
    );

    // Explain it (must be JSON-serializable)
    const explained = explainTransaction(tx);

    return NextResponse.json(
      {
        ok: true,
        network,
        apiBase,
        txid,
        explained,
        // optional minimal tx payload for debugging
        tx: {
          tx_id: tx?.tx_id,
          tx_type: tx?.tx_type,
          tx_status: tx?.tx_status,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    // Always return JSON-safe error
    const safe = serializeError(err);

    return NextResponse.json(
      {
        ok: false,
        error: "Server error while explaining transaction.",
        step: step("server"),
        message: String(err?.message || "Unknown error"),
        status: err?.status || 500,
        debug: safe,
      },
      { status: err?.status || 500 }
    );
  }
}
