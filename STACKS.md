# Stacks Integration

Explain My Transaction is designed specifically for the Stacks ecosystem.

It uses the Hiro API to retrieve and analyze blockchain transaction data, and includes a Clarity smart contract built using Clarinet.

---

## Blockchain

Stacks

Stacks enables smart contracts and decentralized applications secured by Bitcoin.

Learn more:

https://stacks.co

---

## API Provider

This project uses the Hiro API to retrieve transaction data.

Hiro provides developer infrastructure for the Stacks ecosystem.

API documentation:

https://docs.hiro.so

---

## Supported Networks

The application supports both:

- Stacks Mainnet
- Stacks Testnet

The network is automatically detected when possible, but users can also manually select the network.

---

## Transaction Parsing

Transactions are analyzed to detect:

- token transfers
- contract calls
- asset events
- swap interactions
- transaction fees
- sender and recipient addresses

The parsed data is then converted into a human-readable explanation.

Example:

This transaction executed a contract call to the Velar router, paying 0.01 STX in fees.


---

## Smart Contract

The repository contains a Clarity smart contract project built with Clarinet.

Location:

/contracts


Structure:

contracts
│
├── contracts
├── tests
├── deployments
├── Clarinet.toml


This contract demonstrates how human-readable transaction explanations could be stored and retrieved on-chain.

---

## Development Tools

Clarity smart contracts were developed using:

- Clarinet
- TypeScript tooling
- Vitest for testing

---

## Future On-Chain Integration

Future versions of Explain My Transaction may allow:

- storing transaction explanations on-chain
- retrieving explanations for past transactions
- community contributed transaction narratives

This would create a decentralized knowledge layer for the Stacks blockchain.

---

## Stacks Ecosystem Impact

Explain My Transaction improves the Stacks ecosystem by making blockchain activity easier to understand.

This benefits:

- new users onboarding to Stacks
- developers debugging smart contracts
- explorers and analytics platforms
- customer support teams
- educators and content creators

By translating blockchain data into clear explanations, the project helps make the Stacks ecosystem more accessible and transparent.