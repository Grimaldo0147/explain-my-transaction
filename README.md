ExplainMyTx

Turn complex Stacks transactions into human readable explanations.

ExplainMyTx is an open-source explorer companion that helps anyone understand what happened in a Stacks transaction without needing blockchain knowledge.

Instead of showing raw JSON and contract data, ExplainMyTx translates blockchain activity into plain English.


Live Demo:

https://explain-my-transaction.vercel.app/


Why ExplainMyTx?

Reading blockchain transactions can be difficult.

Wallets and explorers often expose:

- Raw JSON
- Hex memos
- Contract identifiers
- Event arrays
- Technical transaction types

This makes onboarding difficult for:

- New Bitcoin users
- Stacks users
- Developers
- Community managers
- Support teams
- Content creators

ExplainMyTx solves this by generating easy to read explanations.

Example:

Instead of:

“token_transfer”

Users see:

“You sent 25 STX to Alice and paid a 0.00018 STX network fee.”


Features:

* Transaction Explainer

Paste a transaction ID or Hiro Explorer link.

Explains:

- STX transfers
- Contract calls
- Smart contract deployments
- Token transfers
- NFT activity
- Fees
- Sender
- Recipient
- Status
- Block
- Timestamp


* Wallet Explainer

Paste any Stacks wallet address.

Instantly see:

- Recent wallet activity
- Human-readable summaries
- Transfers
- Contract interactions
- Incoming transactions
- Outgoing transactions


* Human Summaries

Instead of blockchain jargon:

“contract_call”

Users read:

“Called Arkadiko to repay a vault loan.”


* Memo Decoder

Automatically detects:

- UTF-8 memos
- ASCII memos
- Hex memos

Displays readable text whenever possible.


* Event Timeline

Each transaction is broken into readable events.

Examples:

- Sent STX
- Received SIP-010 token
- Minted NFT
- Called contract
- Paid fee


* Explain This Transaction

Every wallet activity card includes:

- Explain this transaction

One click instantly opens the full explanation.


* Explorer Links

Quick access to:

- Hiro Explorer
- Original transaction

-—————————

Built With:

- Next.js
- React
- TypeScript
- TailwindCSS
- Hiro API
- Stacks Blockchain

-———————

Roadmap:

* Phase 1

- Transaction explanations
- Wallet activity
- Memo decoding
- Human summaries
- Event cards
- Fee detection
- Explain Transaction button



* Phase 2 

- Wallet Connect
- Saved history
- Shareable explanation pages
- Better NFT explanations
- SIP-010 token metadata
- Multi-network improvements
- Faster API caching


* Phase 3

- AI-powered explanations
- Natural language search

Example:

What happened in my wallet yesterday?

-————————-

Developer API

Allow wallets and explorers to generate explanations automatically.

-—————-

Browser Extension

Explain transactions directly inside Hiro Explorer.

-—————-

Vision:

ExplainMyTx aims to become the easiest way to understand Stacks transactions.

Rather than replacing explorers, it complements them by making blockchain activity understandable for everyone.

-—————-

Community Impact: 

ExplainMyTx helps onboard new users, reduce support questions, improve wallet UX, educate the community and make Stacks more accessible

-—————-

# Open Source

Contributions are welcome.

Ideas include:

- Better transaction parsers
- New event decoders
- NFT improvements
- SIP support
- Performance improvements


-————-

# Deployment

The project is deployed on Vercel.

Every push to the main branch automatically deploys a new version.

-————-

# Project Status

🟢 Active Development

Current focus:

- Wallet Connect
- Better contract explanations
- AI-generated summaries
- Public API
- Educational resources

-—————-

# Author

Built by Grimaldo.btc

X:

https://x.com/explainmytx?s=11

GitHub:

https://github.com/Grimaldo0147/explain-my-transaction

-—————

# License

MIT License

Use it.

Fork it.

Improve it.

Help make Stacks easier for everyone.