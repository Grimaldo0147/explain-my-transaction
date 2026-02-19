import { NextRequest, NextResponse } from "next/server";
import { parseStacksTransaction } from "@/utils/parseStacksTx";
import { explainTransaction } from "@/features/explain-transaction/explainTx";

type Network = "mainnet" | "testnet";

function safeJson(data: any, status = 200) {
  return new NextResponse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function isValidTxid(input: string) {
  const s = input.trim().toLowerCase();
  const cleaned = s.startsWith("0x") ? s.slice(2) : s;
  return /^[0-9a-f]{64}$/.test(cleaned);
}

function normalizeTxid(input: string) {
  const s = input.trim().toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const txidInput = String(body?.txid ?? "").trim();
    const network = (String(body?.network ?? "mainnet") as Network) === "testnet" ? "testnet" : "mainnet";

    if (!txidInput || !isValidTxid(txidInput)) {
      return safeJson(
        {
          error: "Invalid txid",
          message: "That doesn’t look like a valid Stacks transaction ID (64 hex characters).",
          status: 400,
        },
        400
      );
    }

    const txid = normalizeTxid(txidInput);

    const base =
      network === "testnet" ? "https://api.testnet.hiro.so" : "https://api.hiro.so";

    const sourceUrl = `${base}/extended/v1/tx/${txid}/raw`;

    const rawRes = await fetch(sourceUrl, { cache: "no-store" });

    if (!rawRes.ok) {
      return safeJson(
        {
          error: "Could not fetch raw tx",
          message: `Could not fetch raw tx. Status: ${rawRes.status}`,
          status: rawRes.status,
          networkChecked: base,
          source: sourceUrl,
        },
        400
      );
    }

    // Hiro raw endpoint returns JSON (usually { raw_tx: "0x..." } or similar)
    const rawJson: any = await rawRes.json();
    const rawTxHex =
      rawJson?.raw_tx || rawJson?.rawTx || rawJson?.tx || rawJson?.raw || "";

    if (!rawTxHex || typeof rawTxHex !== "string") {
      return safeJson(
        {
          error: "Unexpected raw tx shape",
          message: "Hiro returned an unexpected raw tx format.",
          status: 500,
          networkChecked: base,
          source: sourceUrl,
          raw: rawJson,
        },
        500
      );
    }

    const parsed = parseStacksTransaction(rawTxHex);

    const explained = await explainTransaction(parsed, {
      txid,
      network,
      baseUrl: base,
    });

    return safeJson(
      {
        ok: true,
        network,
        source: sourceUrl,
        parsed,
        explanation: explained,
      },
      200
    );
  } catch (e: any) {
    return safeJson(
      {
        error: "Server error while explaining transaction.",
        step: "explain",
        message: e?.message || "Unknown error",
        status: 500,
      },
      500
    );
  }
}