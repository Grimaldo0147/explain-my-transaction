import { NextRequest, NextResponse } from "next/server";

type Network = "mainnet" | "testnet";

const HIRO_API: Record<Network, string> = {
  mainnet: "https://api.hiro.so",
  testnet: "https://api.testnet.hiro.so",
};

function formatMicroStx(micro: string | number | undefined) {
  if (!micro) return undefined;
  const num = Number(micro);
  if (isNaN(num)) return undefined;
  return (num / 1_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  }) + " STX";
}

async function fetchTx(network: Network, txid: string) {
  const url = `${HIRO_API[network]}/extended/v1/tx/${txid}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawTxid = body.txid?.toLowerCase()?.replace(/^0x/, "");
    const networkPref = body.network as Network | "auto";

    if (!rawTxid || rawTxid.length !== 64) {
      return NextResponse.json(
        {
          error: "Invalid transaction ID",
          step: "validate",
          status: 400,
        },
        { status: 400 }
      );
    }

    let tx = null;
    let network: Network = "mainnet";

    if (networkPref === "testnet") {
      network = "testnet";
      tx = await fetchTx("testnet", rawTxid);
    } else if (networkPref === "mainnet") {
      network = "mainnet";
      tx = await fetchTx("mainnet", rawTxid);
    } else {
      // AUTO
      tx = await fetchTx("mainnet", rawTxid);
      if (!tx) {
        network = "testnet";
        tx = await fetchTx("testnet", rawTxid);
      }
    }

    if (!tx) {
      return NextResponse.json(
        {
          error: "Transaction not found",
          step: "fetch",
          status: 404,
        },
        { status: 404 }
      );
    }

    // ---- Normalize ----

    const summary: any = {
      type: tx.tx_type,
      sender: tx.sender_address,
      fee: formatMicroStx(tx.fee_rate),
      status: tx.tx_status,
      blockHeight: tx.block_height,
      timestamp: tx.burn_block_time
        ? new Date(tx.burn_block_time * 1000).toLocaleString()
        : undefined,
    };

    // Token transfer
    if (tx.tx_type === "token_transfer" && tx.token_transfer) {
      summary.recipient = tx.token_transfer.recipient_address;
      summary.amount = formatMicroStx(tx.token_transfer.amount);
      summary.memo = tx.token_transfer.memo;
    }

    // Contract call
    if (tx.tx_type === "contract_call" && tx.contract_call) {
      summary.contract = tx.contract_call.contract_id;
    }

    // ---- Events ----

    const events =
      tx.events?.map((e: any) => ({
        kind: e.event_type,
        amount: e.asset?.amount
          ? formatMicroStx(e.asset.amount)
          : undefined,
        asset: e.asset?.asset_id,
        from: e.asset?.sender,
        to: e.asset?.recipient,
      })) || [];

    return NextResponse.json({
      network,
      txid: "0x" + rawTxid,
      summary,
      events,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Server error while explaining transaction.",
        step: "explain",
        message: err?.message,
        status: 500,
      },
      { status: 500 }
    );
  }
}