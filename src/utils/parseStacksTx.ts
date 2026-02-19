// src/utils/parseStacksTx.ts

export type Network = "mainnet" | "testnet";

export type HiroTx = Record<string, any>;
export type HiroEvent = Record<string, any>;

const HIRO_BASE: Record<Network, string> = {
  mainnet: "https://api.hiro.so",
  testnet: "https://api.testnet.hiro.so",
};

export function normalizeTxid(input: string) {
  const trimmed = (input || "").trim();
  const no0x = trimmed.toLowerCase().startsWith("0x")
    ? trimmed.slice(2)
    : trimmed;

  return {
    raw: trimmed,
    normalized: no0x.toLowerCase(),
    with0x: `0x${no0x.toLowerCase()}`,
  };
}

export function isValidStacksTxidHex(hexNo0x: string) {
  return /^[0-9a-f]{64}$/i.test(hexNo0x);
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    // keep default caching behavior fine for vercel
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let body: any = null;

    // Try parse json error if available
    if (contentType.includes("application/json")) {
      try {
        body = await res.json();
      } catch {}
    } else {
      try {
        body = await res.text();
      } catch {}
    }

    const err: any = new Error(
      typeof body === "string"
        ? body
        : body?.error || body?.message || `Request failed: ${res.status}`
    );
    err.status = res.status;
    err.body = body;
    err.url = url;
    throw err;
  }

  if (!contentType.includes("application/json")) {
    // Safety: don't let HTML bubble into JSON parsing consumers
    const text = await res.text();
    const err: any = new Error("Non-JSON response from Hiro endpoint");
    err.status = 502;
    err.body = text;
    err.url = url;
    throw err;
  }

  return res.json();
}

export async function parseStacksTransaction(opts: {
  txid: string; // can be with or without 0x
  network: Network;
  eventsLimit?: number;
}) {
  const { txid, network, eventsLimit = 50 } = opts;
  const base = HIRO_BASE[network];

  const { normalized, with0x } = normalizeTxid(txid);

  if (!isValidStacksTxidHex(normalized)) {
    const err: any = new Error(
      "That doesn’t look like a valid Stacks transaction ID (64 hex characters)."
    );
    err.status = 400;
    err.step = "validate";
    throw err;
  }

  // Tx summary (JSON)
  const txUrl = `${base}/extended/v1/tx/${with0x}`;
  const tx: HiroTx = await fetchJson(txUrl);

  // Events (JSON)
  const eventsUrl = `${base}/extended/v1/tx/${with0x}/events?limit=${eventsLimit}&offset=0`;
  const eventsRes: any = await fetchJson(eventsUrl);
  const events: HiroEvent[] = Array.isArray(eventsRes?.events)
    ? eventsRes.events
    : Array.isArray(eventsRes)
    ? eventsRes
    : [];

  return {
    network,
    txid: with0x,
    tx,
    events,
    source: txUrl,
    eventsSource: eventsUrl,
  };
}

/**
 * Try mainnet first, then testnet if not found.
 * Useful when users paste random txids and don't know the network.
 */
export async function resolveNetworkAndFetchTx(txid: string) {
  try {
    return await parseStacksTransaction({ txid, network: "mainnet" });
  } catch (e: any) {
    if (e?.status === 404) {
      return await parseStacksTransaction({ txid, network: "testnet" });
    }
    throw e;
  }
}