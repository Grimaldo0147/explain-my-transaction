import { NextResponse } from "next/server";
import { parseStacksTx } from "@/utils/parseStacksTx";
import { explainParsedTx } from "@/lib/explainParsedTx";

// txid = 64 hex chars
function isValidTxid(txid: string) {
  return /^[0-9a-fA-F]{64}$/.test(txid.trim());
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const txid = String(body?.txid ?? "").trim();

    if (!txid || !isValidTxid(txid)) {
      return NextResponse.json(
        { error: "Invalid txid. Expected 64 hex characters." },
        { status: 400 }
      );
    }

    // ✅ Fetch RAW tx hex (this is what your parser needs)
    const rawRes = await fetch(`https://api.hiro.so/v2/transactions/${txid}/raw`, {
      cache: "no-store",
    });

    if (!rawRes.ok) {
      return NextResponse.json(
        { error: `Could not fetch raw tx. Status: ${rawRes.status}` },
        { status: 404 }
      );
    }

    const rawTxHex = (await rawRes.text()).trim();

    // Some endpoints return quotes; normalize just in case
    const cleanedHex = rawTxHex.replace(/^"|"$/g, "");

    const parsedTx = parseStacksTx(cleanedHex);
    const explanation = explainParsedTx(parsedTx);

    return NextResponse.json({
      txid,
      rawTxHex: cleanedHex,
      parsedTx,
      explanation,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
