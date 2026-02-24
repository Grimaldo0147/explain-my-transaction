// src/utils/parseStacksTx.ts

export type Network = "mainnet" | "testnet";
export type NetworkMode = Network | "auto";

export function normalizeStacksTxid(input: string) {
  const raw = (input || "").trim();
  const no0x = raw.toLowerCase().startsWith("0x") ? raw.slice(2) : raw;
  const cleaned = no0x.replace(/[^0-9a-f]/gi, "").toLowerCase();

  const isValid = /^[0-9a-f]{64}$/.test(cleaned);
  return {
    input: raw,
    normalized: isValid ? `0x${cleaned}` : "",
    isValid,
    reason: isValid ? "" : "That doesn’t look like a valid Stacks transaction ID (64 hex characters).",
  };
}

export function getHiroBaseUrl(network: Network) {
  // Hiro Stacks API base URLs
  return network === "mainnet" ? "https://api.hiro.so" : "https://api.testnet.hiro.so";
}

export async function fetchTxFromHiro(txid: string, network: Network) {
  const base = getHiroBaseUrl(network);
  const url = `${base}/extended/v1/tx/${txid}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    // Avoid caching surprises on serverless
    cache: "no-store",
  });

  return { res, url };
}

export async function resolveNetworkAndFetchTx(txid: string, mode: NetworkMode) {
  const tried: Array<{ network: Network; url: string; status: number; ok: boolean }> = [];

  const tryOne = async (network: Network) => {
    const { res, url } = await fetchTxFromHiro(txid, network);
    tried.push({ network, url, status: res.status, ok: res.ok });
    if (!res.ok) return { ok: false as const, network, url, status: res.status, data: null as any };
    const data = await res.json();
    return { ok: true as const, network, url, status: res.status, data };
  };

  if (mode === "mainnet" || mode === "testnet") {
    const out = await tryOne(mode);
    return { ...out, tried };
  }

  // auto: mainnet -> testnet
  const main = await tryOne("mainnet");
  if (main.ok) return { ...main, tried };

  const test = await tryOne("testnet");
  return { ...test, tried };
}