import { NextRequest, NextResponse } from "next/server";
import { parseStacksTransaction } from "@/utils/parseStacksTx";
import { explainTransaction } from "@/features/explain-transaction/explainTx";

type Network = "auto" | "mainnet" | "testnet";

const HIRO_BASE: Record<"mainnet" | "testnet", string> = {
  mainnet: "https://api.hiro.so",
  testnet: "https://api.testnet.hiro.so",
};

function normalizeTxid(input: string) {
  if (!input) return "";
  const raw = input.trim();

  const match = raw.match(/(0x)?[0-9a-fA-F]{64}/);
  if (!match) return "";

  const txid = match[0].startsWith("0x") ? match[0] : `0x${match[0]}`;
  return txid.toLowerCase();
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) =>
      typeof val === "bigint" ? val.toString() : val
    )
  );
}

async function fetchWithTimeout(url: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "ExplainMyTransaction/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTransaction(txid: string, network: "mainnet" | "testnet") {
  const base = HIRO_BASE[network];
  const url = `${base}/extended/v1/tx/${txid}`;

  let res: Response;

  try {
    res = await fetchWithTimeout(url, 15000);
  } catch (error: any) {
    const err: any = new Error(
      error?.name === "AbortError"
        ? "Request to Hiro API timed out."
        : "Failed to connect to Hiro API."
    );
    err.status = 500;
    err.source = url;
    err.note = error?.message || "fetch failed";
    throw err;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err: any = new Error(`Hiro API error: ${res.status}`);
    err.status = res.status;
    err.source = url;
    err.raw = text;
    throw err;
  }

  return {
    json: await res.json(),
    source: url,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const input = String(body?.input || body?.txid || "").trim();
    const network = String(body?.network || "auto") as Network;

    const txid = normalizeTxid(input);

    if (!txid) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid transaction ID",
          step: "validate",
          status: 400,
          message:
            "That doesn’t look like a valid Stacks transaction ID or explorer link.",
        },
        { status: 400 }
      );
    }

    let detectedNetwork: "mainnet" | "testnet" = "mainnet";
    let txJson: any;
    let source = "";

    if (network === "auto") {
      try {
        const mainnetResult = await fetchTransaction(txid, "mainnet");
        txJson = mainnetResult.json;
        source = mainnetResult.source;
        detectedNetwork = "mainnet";
      } catch (mainErr: any) {
        try {
          const testnetResult = await fetchTransaction(txid, "testnet");
          txJson = testnetResult.json;
          source = testnetResult.source;
          detectedNetwork = "testnet";
        } catch (testErr: any) {
          return NextResponse.json(
            jsonSafe({
              ok: false,
              error: "Server error while explaining transaction.",
              step: "fetch",
              status: testErr?.status || mainErr?.status || 500,
              message: testErr?.message || mainErr?.message || "Unknown fetch error",
              source: testErr?.source || mainErr?.source,
              note: testErr?.note || mainErr?.note || "Both mainnet and testnet fetch failed.",
              raw: testErr?.raw || mainErr?.raw,
            }),
            { status: testErr?.status || mainErr?.status || 500 }
          );
        }
      }
    } else {
      const fixedNetwork = network as "mainnet" | "testnet";
      const result = await fetchTransaction(txid, fixedNetwork);
      txJson = result.json;
      source = result.source;
      detectedNetwork = fixedNetwork;
    }

    const parsed = parseStacksTransaction(txJson, detectedNetwork);
    const explained = explainTransaction(parsed);

    return NextResponse.json(
      jsonSafe({
        ok: true,
        data: {
          ...explained,
          txid,
          network: detectedNetwork,
          source,
        },
      }),
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      jsonSafe({
        ok: false,
        error: "Server error while explaining transaction.",
        step: "fetch",
        status: err?.status || 500,
        message: err?.message || "Unknown error",
        source: err?.source,
        note: err?.note,
        raw: err?.raw,
      }),
      { status: err?.status || 500 }
    );
  }
}