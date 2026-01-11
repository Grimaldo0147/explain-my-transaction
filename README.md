# Explain My Transaction

Explain Stacks blockchain transactions in simple, human-readable language.

This app helps anyone understand **what a Stacks transaction actually did**, without needing to read complex blockchain data.

---

## 🔍 What Is This?

When you paste a **Stacks transaction hash** into the app and click **Explain**, the app:

1. Fetches the real transaction from the blockchain  
2. Extracts the important details  
3. Explains the transaction in plain English  
4. Shows the result in a clean interface  

You don’t need to understand blockchain jargon to use it.

---

## 🧠 Why This App Exists

Blockchain explorers show a lot of technical information, but they don’t clearly answer questions like:

- Did this transaction succeed or fail?
- Who sent it?
- What kind of transaction was it?
- What actually happened?

**Explain My Transaction** answers those questions clearly.

---

## 🔄 How It Works (Step by Step)

Here is what happens when you click **Explain**:

1. **Frontend**
   - You paste a transaction hash into the input box
   - The app sends that hash to the backend

2. **Backend API**
   - The app checks if the transaction hash is valid
   - It requests the transaction data from the Stacks blockchain (via Hiro API)

3. **Transaction Parsing**
   - The raw blockchain data is cleaned up
   - Only useful information is kept (sender, status, fee, type, block)

4. **Explanation**
   - The app converts the parsed data into a clear English explanation
   - No guessing, no AI hallucinations

5. **UI Output**
   - Summary cards are displayed
   - A readable explanation is shown
   - You can copy the explanation or view the transaction on the explorer

---

## 🧱 Design Principles

This project follows a few simple rules:

- **Facts first**  
  Explanations are based only on real blockchain data.

- **No guessing**  
  The app does not invent information.

- **One job per file**  
  Each part of the app does one thing clearly.

- **Easy to extend later**  
  AI explanations or new blockchains can be added without rewriting the app.

---

## 🛠 Tech Used

- **Next.js** – frontend and backend in one app  
- **TypeScript** – safer and clearer code  
- **Tailwind CSS** – clean and simple styling  
- **Stacks / Hiro API** – real blockchain data  

---

## ✨ Features

- Validates transaction hashes
- Handles:
  - Successful transactions
  - Failed transactions
  - Pending transactions
- Shows:
  - Sender
  - Transaction type
  - Fee
  - Block height
- Plain-English explanation
- Copy explanation button
- Direct link to Stacks Explorer

---

## ▶️ Run the App Locally

If you want to run this app on your own computer:

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/explain-my-transaction.git
cd explain-my-transaction
---

## Code for Stacks Submission

This project is submitted as part of the Code for Stacks program to improve Stacks UX and developer experience by making blockchain transactions easier to understand.
