import { NextResponse } from "next/server"
import { parseStacksTx } from "../../../lib/parseStacksTx"
import { explainParsedTx } from "../../../lib/explainParsedTx"

// Simple Stacks txid validator
function isValidTxid(txid: string) {
  if (!txid.startsWith("0x")) return false
  if (txid.length !== 66) return false
  if (!/^0x[a-fA-F0-9]+$/.test(txid)) return false
  return true
}

export async function POST(request: Request) {
  try {
    const { txid } = await request.json()

    // 1. Validate presence
    if (!txid) {
      return NextResponse.json(
        { error: "Transaction hash is required." },
        { status: 400 }
      )
    }

    // 2. Validate format
    if (!isValidTxid(txid)) {
      return NextResponse.json(
        {
          error:
            "Invalid transaction hash format. Please provide a valid Stacks txid.",
        },
        { status: 400 }
      )
    }

    // 3. Fetch transaction from Hiro API
    const res = await fetch(
      `https://api.mainnet.hiro.so/extended/v1/tx/${txid}`
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: "Transaction not found on Stacks." },
        { status: 404 }
      )
    }

    // 4. Parse transaction
    const txData = await res.json()
    const parsed = parseStacksTx(txData)

    // 5. Deterministic explanation (NO AI)
    const explanation = explainParsedTx(parsed)

    return NextResponse.json({
      success: true,
      parsed,
      explanation,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error while explaining transaction." },
      { status: 500 }
    )
  }
}
