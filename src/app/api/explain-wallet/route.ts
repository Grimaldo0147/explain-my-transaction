import { NextRequest, NextResponse } from "next/server";

type Network = "mainnet" | "testnet";

const HIRO_BASE: Record<Network, string> = {
  mainnet: "https://api.hiro.so",
  testnet: "https://api.testnet.hiro.so",
};

function isStacksAddress(address: string) {
  const a = (address || "").trim();
  return /^(SP|SM|ST)[A-Z0-9]{20,}$/i.test(a);
}

function shortAddr(addr?: string | null) {
  if (!addr) return "";
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function microToStx(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num / 1_000_000;
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) =>
      typeof val === "bigint" ? val.toString() : val
    )
  );
}

async function fetchWithTimeout(url: string, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "ExplainMyTransaction/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAddressTransactions(address: string, network: Network) {
  const base = HIRO_BASE[network];
  const url = `${base}/extended/v1/address/${address}/transactions?limit=5&offset=0`;

  let res: Response;
  try {
    res = await fetchWithTimeout(url, 30000);
  } catch (error: any) {
    const err: any = new Error(
      error?.name === "AbortError"
        ? "Request to Hiro API timed out. Try again or reduce the number of transactions fetched."
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

function detectProtocol(contractId?: string | null) {
  const lower = String(contractId || "").toLowerCase();

  if (!lower) return null;
  if (lower.includes("velar")) return "Velar";
  if (lower.includes("alex")) return "ALEX";
  if (lower.includes("bitflow")) return "Bitflow";
  if (lower.includes("arkadiko")) return "Arkadiko";
  if (lower.includes("zest")) return "Zest";
  if (lower.includes("granite")) return "Granite";

  return null;
}

function explainWalletTx(tx: any, wallet: string) {
  const txid = tx?.tx_id || "";
  const type = tx?.tx_type || "unknown";
  const status = tx?.tx_status || "";
  const sender = tx?.sender_address || "";
  const blockHeight = tx?.block_height ?? null;
  const timeIso = tx?.burn_block_time_iso || tx?.block_time_iso || null;

  const feeRate = tx?.fee_rate ?? tx?.fee ?? null;
  const feeStx = microToStx(feeRate);

  let action = "Unknown activity";
  let summary = "Unknown activity";
  let direction = "neutral";
  let amountStx: number | null = null;
  let recipient: string | null = null;
  let contract: string | null = null;
  let functionName: string | null = null;
  let protocol: string | null = null;

  if (type === "token_transfer") {
    recipient = tx?.token_transfer?.recipient_address || null;
    amountStx = microToStx(tx?.token_transfer?.amount);
    const incoming = recipient?.toLowerCase() === wallet.toLowerCase();

    if (incoming) {
      action = "Received STX";
      summary = `Received ${amountStx ?? "some"} STX from ${shortAddr(sender)}.`;
      direction = "in";
    } else {
      action = "Sent STX";
      summary = `Sent ${amountStx ?? "some"} STX to ${shortAddr(recipient)}.`;
      direction = "out";
    }
  } else if (type === "contract_call") {
    contract = tx?.contract_call?.contract_id || null;
    functionName = tx?.contract_call?.function_name || null;
    protocol = detectProtocol(contract);

    const lowerFn = String(functionName || "").toLowerCase();
    const looksLikeSwap =
      Boolean(protocol) ||
      lowerFn.includes("swap") ||
      lowerFn.includes("trade") ||
      lowerFn.includes("route");

    if (looksLikeSwap) {
      action = protocol ? `Swap on ${protocol}` : "Swap";
      summary = protocol
        ? `Executed a swap through ${protocol}${functionName ? ` (${functionName})` : ""}.`
        : `Executed a swap${functionName ? ` via ${functionName}` : ""}.`;
    } else {
      action = "Contract Call";
      summary = protocol
        ? `Called ${protocol}${functionName ? ` (${functionName})` : ""}.`
        : `Called ${contract || "a smart contract"}${functionName ? ` (${functionName})` : ""}.`;
    }
  } else if (type === "smart_contract") {
    contract = tx?.smart_contract?.contract_id || null;
    action = "Contract Deploy";
    summary = `Deployed ${contract || "a smart contract"}.`;
  } else if (type === "coinbase") {
    action = "Coinbase";
    summary = "Coinbase transaction.";
  }

  return {
    txid,
    type,
    status,
    action,
    summary,
    direction,
    sender,
    recipient,
    contract,
    functionName,
    protocol,
    amountStx,
    feeStx,
    blockHeight,
    timeIso,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const address = String(body?.address || "").trim();
    const network = String(body?.network || "mainnet") as Network;

    if (!address) {
      return NextResponse.json(
        {
          ok: false,
          error: "Wallet address is required.",
          step: "validate",
          status: 400,
        },
        { status: 400 }
      );
    }

    if (!isStacksAddress(address)) {
      return NextResponse.json(
        {
          ok: false,
          error: "That doesn’t look like a valid Stacks wallet address.",
          step: "validate",
          status: 400,
        },
        { status: 400 }
      );
    }

    const fixedNetwork: Network =
      network === "testnet" ? "testnet" : "mainnet";

    const { json, source } = await fetchAddressTransactions(address, fixedNetwork);

    const rawTxs = Array.isArray(json?.results) ? json.results : [];
    const activities = rawTxs.map((tx: any) => explainWalletTx(tx, address));

    return NextResponse.json(
      jsonSafe({
        ok: true,
        data: {
          address,
          network: fixedNetwork,
          source,
          count: activities.length,
          activities,
        },
      }),
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      jsonSafe({
        ok: false,
        error: "Server error while explaining wallet activity.",
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