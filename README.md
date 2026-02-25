# Explain My Transaction

Turn a Stacks transaction ID into a clean, human-readable breakdown.

Blockchain explorers show raw data.
We show clarity.

Live Product: https://explain-my-transaction.vercel.app

⸻

# The Problem

Blockchain transactions are powerful, but confusing.

Explorers expose:
	•	Raw JSON
	•	Hex values
	•	Technical fields
	•	Developer-centric data

For most users, this creates friction.

Web3 adoption depends on better UX.

⸻

# The Solution

Explain My Transaction transforms a Stacks txid into a structured, product-style summary:
	•	Transaction Type
	•	Sender
	•	Recipient / Contract Target
	•	Fee
	•	Amount (when applicable)
	•	Events (transfers, contract calls, mints, etc.)
	•	Network detection (Mainnet / Testnet)

No jargon.
No explorer chaos.
Just clarity.

⸻

# Built for the Stacks Ecosystem

	•	Powered by the Hiro Stacks API
	•	Supports Mainnet & Testnet
	•	Auto network resolution
	•	Safe BigInt handling
	•	Clean API layer architecture

Designed to make Stacks more understandable for:
	•	Builders
	•	Community managers
	•	Support teams
	•	Content creators
	•	New Web3 users

⸻

# Architecture

src/
 ├── app/
 │    ├── api/explain/route.ts
 │    └── page.tsx
 │
 ├── features/
 │    └── explain-transaction/
 │         └── explainTx.ts
 │
 └── utils/
      └── parseStacksTx.ts

Flow
	1.	User submits txid
	2.	API route fetches raw transaction
	3.	Transaction is parsed
	4.	Explanation layer transforms it into human-readable output
	5.	UI renders structured product cards

⸻

# Tech Stack

	•	Next.js 16 (App Router)
	•	TypeScript
	•	Tailwind CSS
	•	Hiro API
	•	Vercel

⸻

# Local Development

git clone https://github.com/YOUR_USERNAME/explain-my-transaction.git
cd explain-my-transaction
npm install
npm run dev

Open:
http://localhost:3000

⸻

# Security

	•	No wallet connection required
	•	No private keys stored
	•	Public on-chain data only
	•	Sensitive files excluded via .gitignore

⸻

# Vision

Web3 UX needs to feel like Web2.

This project is a step toward:
	•	Human-readable blockchain
	•	On-chain transparency tools
	•	Developer-friendly UX layers
	•	Better onboarding for crypto ecosystems

Future directions:
	•	Token metadata enrichment
	•	Explorer deep-linking
	•	STX value formatting
	•	Historical tx analytics
	•	Multi-chain expansion

⸻

# Contributing

Contributions are welcome.

Open an issue for:
	•	Feature requests
	•	UX improvements
	•	API enhancements
	•	Parsing improvements

⸻

# License

MIT

⸻

# Author

Grimaldo

Focused on building clarity tools for Web3.
