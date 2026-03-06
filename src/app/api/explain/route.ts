import { NextRequest, NextResponse } from "next/server";
import { explainTransaction } from "@/features/explain-transaction/explainTx";

type Network = "mainnet" | "testnet";

function normalizeTxid(input: string) {
  if (!input) return "";
  const t = input.trim();
  const m = t.match(/(0x)?[0-9a-fA-F]{64}/);
  if (!m) return "";
  return m[0].startsWith("0x") ? m[0] : `0x${m[0]}`;
}

async function fetchTransaction(txid: string, network: Network) {
  const base =
    network === "testnet"
      ? "https://api.testnet.hiro.so"
      : "https://api.hiro.so";

  const url = `${base}/extended/v1/tx/${txid}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Hiro API error: ${res.status}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const input = body.input || "";
    const network = body.network || "auto";

    const txid = normalizeTxid(body.txid || input);

    if (!txid) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid transaction ID",
          step: "validate",
        },
        { status: 400 }
      );
    }

    let tx = null;
    let detectedNetwork: Network = "mainnet";

    if (network === "auto") {
      try {
        tx = await fetchTransaction(txid, "mainnet");
        detectedNetwork = "mainnet";
      } catch {
        tx = await fetchTransaction(txid, "testnet");
        detectedNetwork = "testnet";
      }
    } else {
      detectedNetwork = network;
      tx = await fetchTransaction(txid, network);
    }

    const explained = explainTransaction(tx);

    return NextResponse.json({
      ok: true,
      data: {
        ...explained,
        network: detectedNetwork,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Server error while explaining transaction.",
        step: "fetch",
        message: err.message,
      },
      { status: 500 }
    );
  }
}