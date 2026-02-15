// src/utils/parseStacksTx.ts

export type StacksNetwork = "mainnet" | "testnet";

export type FetchTxResult = {
  network: StacksNetwork;
  apiBase: string;
  tx: any;
  txid: string; // normalized (no 0x)
};

/**
 * Normalize user input into a Stacks txid:
 * - trims
 * - removes leading 0x if present
 * - lowercases
 */
export function normalizeTxid(input: string): string {
  const raw = (input || "").trim();
  const no0x = raw.toLowerCase().startsWith("0x") ? raw.slice(2) : raw;
  return no0x.toLowerCase();
}

/**
 * True if txid looks like 64 hex chars (Stacks txid).
 */
export function isValidTxid(txid: string): boolean {
  return /^[0-9a-f]{64}$/.test(txid);
}

/**
 * Hiro API base URLs (mainnet/testnet)
 */
export function getHiroBase(network: StacksNetwork): string {
  return network === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so";
}

/**
 * Fetch a transaction from Hiro JSON endpoint.
 * We use the JSON tx endpoint (not /raw) to avoid BigInt serialization issues.
 */
export async function fetchTxJson(
  txid: string,
  network: StacksNetwork,
  signal?: AbortSignal
): Promise<any> {
  const apiBase = getHiroBase(network);
  const url = `${apiBase}/extended/v1/tx/${txid}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    signal,
  });

  if (!res.ok) {
    const text = await safeReadText(res);
    const err: any = new Error(`Could not fetch tx JSON. Status: ${res.status}`);
    err.status = res.status;
    err.url = url;
    err.body = text;
    throw err;
  }

  return res.json();
}

/**
 * Try mainnet first, then testnet. Returns the first network that has the tx.
 * If both fail, throws a helpful error.
 */
export async function resolveNetworkAndFetchTx(
  txid: string,
  preferred?: StacksNetwork,
  signal?: AbortSignal
): Promise<FetchTxResult> {
  const order: StacksNetwork[] = preferred
    ? [preferred, preferred === "mainnet" ? "testnet" : "mainnet"]
    : ["mainnet", "testnet"];

  let lastErr: any = null;

  for (const net of order) {
    try {
      const tx = await fetchTxJson(txid, net, signal);
      return {
        network: net,
        apiBase: getHiroBase(net),
        tx,
        txid,
      };
    } catch (e: any) {
      lastErr = e;
      // if it's not found, keep trying the other network
      // Hiro often uses 404 for "tx not found"
      if (e?.status !== 404) {
        // for other errors (rate limit/500), still try the other network,
        // but keep the error for reporting if both fail
      }
    }
  }

  // If we get here, both networks failed
  const err: any = new Error(
    lastErr?.status === 404
      ? "Transaction not found on mainnet or testnet (Hiro)."
      : "Failed to fetch transaction from Hiro."
  );
  err.status = lastErr?.status || 500;
  err.lastError = serializeError(lastErr);
  throw err;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * Make any error JSON-safe (also prevents BigInt serialization issues).
 */
export function serializeError(err: any) {
  try {
    return JSON.parse(
      JSON.stringify(
        err,
        (_k, v) => (typeof v === "bigint" ? v.toString() : v),
        2
      )
    );
  } catch {
    return {
      message: String(err?.message || err),
      name: err?.name,
    };
  }
}
