# Explain My Transaction

Turn a Stacks transaction into a human-readable explanation.

Explain My Transaction is a developer and user tool that converts raw Stacks blockchain transactions into simple, understandable summaries.

Instead of reading complex blockchain data, users can paste a transaction ID or explorer link and instantly understand what happened.

Example output:

"This transaction executed a contract call to the Velar router, paying 0.01 STX in fees."

This tool helps improve transparency, onboarding, and developer experience across the Stacks ecosystem.

---

## Problem

Stacks transactions can be difficult to understand for new users.

A typical transaction contains raw fields like:

- contract_call
- sender address
- fee amount
- asset events
- function calls

These details are difficult for non-developers to interpret.

Explain My Transaction solves this by translating blockchain data into human-readable explanations.

---

## Solution

Explain My Transaction parses transaction data from the Stacks blockchain and generates clear summaries describing:

- transaction type
- sender and recipient
- smart contract interactions
- token transfers
- fees paid
- swap activity (DEX interactions)

This makes it easier for:

- new Stacks users
- developers
- explorers
- analytics platforms
- support teams

to quickly understand transaction behavior.

---

## Features

• Paste a Stacks **transaction ID**  
• Paste a **Hiro explorer transaction link**  
• Automatic **transaction normalization**  
• **Human readable summaries**  
• **Smart contract call detection**  
• **Token transfer breakdown**  
• **DEX swap detection (Velar, etc.)**  
• Clean UI for transaction insights

Example explanation:

> This transaction executed a contract call to the Velar router, paying 0.01 STX in fees.

---

## How It Works

1. User pastes a transaction ID or explorer link
2. The app extracts and normalizes the transaction ID
3. The API fetches transaction data from the Stacks network using the Hiro API
4. Transaction events are parsed and interpreted
5. A human-readable explanation is generated and displayed

---

## Tech Stack

Frontend
- Next.js
- React
- TypeScript

Backend
- Next.js API Routes

Blockchain
- Stacks
- Hiro API

Smart Contracts
- Clarity
- Clarinet

---

## Smart Contract

This project includes a Clarity smart contract used for experimentation with storing transaction narratives on-chain.

Location:

/contracts


Built using:

- Clarinet
- Clarity smart contracts

The contract demonstrates how transaction explanations could eventually be written and retrieved from the blockchain.

---

## Project Structure

explain-my-tx
│
├── src
│ ├── app
│ ├── features
│ ├── utils
│
├── public
│
├── contracts
│ ├── contracts
│ ├── deployments
│ ├── tests
│
├── README.md
├── STACKS.md
├── PROGRESS.md


---

## Example Usage

Paste a transaction ID:

0x5a047f3f7ec9221c43fdb63bc4abf1673707f3a404da13bbdad7ae670b0c81e7


Or paste a full explorer link:
https://explorer.hiro.so/txid/0x5a047f3f7ec9221c43fdb63bc4abf1673707f3a404da13bbdad7ae670b0c81e7


The app will automatically extract the txid and explain the transaction.

---

## Future Improvements

Planned features include:

- wallet transaction summaries
- DEX swap summaries
- NFT transaction explanations
- shareable transaction explanation links
- AI assisted transaction explanations

---

## Why This Matters

Improving transaction readability helps make the Stacks ecosystem more accessible to:

- new crypto users
- developers
- analysts
- customer support teams
- explorers and dashboards

Explain My Transaction aims to become a human-readable layer for the Stacks blockchain.

---

## Built for the Stacks Ecosystem

This project was built to improve developer and user experience within the Stacks ecosystem.

Learn more about Stacks:

https://stacks.co

---

## License

MIT License
