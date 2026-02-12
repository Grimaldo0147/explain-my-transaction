"use client"

import { useState } from "react"

type ParsedTx = {
  txid: string
  type: string
  sender?: string
  receiver?: string
  fee?: string
  blockHeight?: string
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  if (!value) return null

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-1 break-all font-mono text-sm text-white">
        {value}
      </div>
    </div>
  )
}

export default function Home() {
  const [txid, setTxid] = useState("")
  const [parsed, setParsed] = useState<ParsedTx | null>(null)
  const [explanation, setExplanation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleExplain() {
    if (!txid) return

    setLoading(true)
    setError("")
    setParsed(null)
    setExplanation("")

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txid }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to explain transaction")
      }

      setParsed(data.parsed)
      setExplanation(data.explanation)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-center text-3xl font-bold text-white">
        Explain My Transaction
      </h1>

      <div className="mb-6 flex gap-2">
        <input
          className="flex-1 rounded-md border border-neutral-700 bg-black px-3 py-2 text-white outline-none"
          placeholder="Paste Stacks transaction ID"
          value={txid}
          onChange={(e) => setTxid(e.target.value)}
        />
        <button
          onClick={handleExplain}
          disabled={loading}
          className="rounded-md bg-white px-4 py-2 font-semibold text-black disabled:opacity-50"
        >
          {loading ? "Explaining..." : "Explain"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-700 bg-red-900/30 p-3 text-red-300">
          {error}
        </div>
      )}

      {parsed && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoCard label="Sender" value={parsed.sender} />

          {/* ✅ RECEIVER CARD (TOKEN TRANSFERS ONLY) */}
          {parsed.type === "token_transfer" && parsed.receiver && (
            <InfoCard label="Receiver" value={parsed.receiver} />
          )}

          <InfoCard label="Type" value={parsed.type} />
          <InfoCard label="Fee" value={parsed.fee} />
          <InfoCard label="Block" value={parsed.blockHeight} />
        </div>
      )}

      {explanation && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-2 text-sm font-semibold text-neutral-400">
            Explanation
          </div>
          <p className="text-white">{explanation}</p>
        </div>
      )}
    </main>
  )
}
