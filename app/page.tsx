"use client"

import { useState } from "react"

export default function Home() {
  const [txid, setTxid] = useState("")
  const [parsed, setParsed] = useState<any | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleExplain() {
    if (!txid) return

    setLoading(true)
    setError(null)
    setParsed(null)
    setExplanation(null)

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txid }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
      } else {
        setParsed(data.parsed)
        setExplanation(data.explanation)
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!explanation) return
    navigator.clipboard.writeText(explanation)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleReset() {
    setTxid("")
    setParsed(null)
    setExplanation(null)
    setError(null)
    setCopied(false)
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center gap-8">
      <h1 className="text-3xl font-bold">Explain My Transaction</h1>

      {/* Input + Button */}
      <div className="w-full max-w-xl flex gap-2">
        <input
          type="text"
          placeholder="Paste Stacks transaction hash"
          value={txid}
          onChange={(e) => setTxid(e.target.value)}
          className="flex-1 px-4 py-3 rounded bg-white text-black"
        />
        <button
          onClick={handleExplain}
          disabled={loading}
          className="px-6 py-3 rounded bg-white text-black font-semibold disabled:opacity-50"
        >
          {loading ? "Explaining…" : "Explain"}
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-red-400">{error}</p>}

      {/* Transaction Summary Cards */}
      {parsed && (
        <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
          <InfoCard label="Sender" value={parsed.sender} />
          <InfoCard label="Type" value={parsed.type} />
          <InfoCard label="Fee" value={parsed.fee} />
          <InfoCard label="Block" value={parsed.blockHeight} />
        </div>
      )}

      {/* Explanation */}
      {explanation && parsed && (
        <div className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Explanation</h2>

            <div className="flex gap-3 text-sm">
              <button
                onClick={handleCopy}
                className="text-blue-400 hover:underline"
              >
                {copied ? "Copied!" : "Copy"}
              </button>

              <a
                href={`https://explorer.hiro.so/txid/${parsed.txid}?chain=mainnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                View on Explorer ↗
              </a>
            </div>
          </div>

          <p className="whitespace-pre-line text-gray-200">
            {explanation}
          </p>
        </div>
      )}

      {/* Clear Button */}
      {(parsed || error) && (
        <button
          onClick={handleReset}
          className="text-sm text-gray-400 hover:underline"
        >
          Clear
        </button>
      )}
    </main>
  )
}

function InfoCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="font-mono break-all">{value}</p>
    </div>
  )
}
