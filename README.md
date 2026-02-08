# Explain My Transaction

**Explain My Transaction** is a UX-first tool that helps users understand what actually happened in a Stacks transaction — in plain, human-readable language.

Most blockchain explorers expose raw data.  
This project focuses on **meaning, clarity, and trust**.

---

## Problem

For many users, interacting with Stacks feels opaque:

- Transactions show hashes, hex, and fields without explanation
- Users often sign transactions without fully understanding the outcome
- Explorers are optimized for developers, not everyday users
- Confusion during onboarding leads to mistrust and drop-off

This problem is especially visible for **non-technical users** entering the Stacks ecosystem.

---

## Solution

Explain My Transaction translates raw Stacks transactions into clear explanations that answer questions like:

- What type of transaction was this?
- What did it do to my wallet?
- How was it anchored?
- Why did it succeed or fail?

The goal is **not abstraction**, but **understanding**.

---

## Current State

The project is already live and functional:

- Transaction parsing and explanation logic using Stacks tooling
- UX-first design focused on readability and comprehension
- A read-only Clarity helper contract deployed on Stacks mainnet
- Production-ready web build deployed on Vercel

This demonstrates the ability to ship, iterate, and deploy on mainnet.

---

## Mainnet Deployment (On-chain Proof)

The project includes a small, read-only Clarity helper contract deployed on **Stacks mainnet**.

- Purpose: act as an on-chain UX anchor for explanation and wallet-story tooling
- The contract is intentionally simple and safe
- It provides verifiable proof of Stacks-native development

> The contract does not move funds or perform complex logic.  
> It exists to support UX tooling and future extensions.

---

## Repository Structure

This repository contains **two clearly separated parts**:

```text
/
├─ src/                      # Next.js application (UX + logic)
├─ wallet-story-contract/    # Clarity smart contract tooling
├─ README.md
├─ PROGRESS.md
└─ STACKS.md
