export function explainParsedTx(parsed: any) {
  // 1. Pending transaction
  if (parsed.blockHeight === "Pending") {
    return `This transaction is still pending and has not yet been confirmed on the Stacks blockchain.`
  }

  // 2. Failed transaction
  if (parsed.status === "failed") {
    return `This transaction failed. Reason: ${parsed.error || "Unknown error."}`
  }

  // 3. Contract call
  if (parsed.type === "contract_call" && parsed.contractCall) {
    const { contract, function: fn, args } = parsed.contractCall

    return `This transaction was successful.
The sender (${parsed.sender}) called the function "${fn}" on the contract "${contract}" with arguments: ${args.join(", ")}.`
  }

  // 4. Token transfer
  if (parsed.type === "token_transfer") {
    return `This transaction successfully transferred tokens from ${parsed.sender}.`
  }

  // 5. Fallback
  return `This transaction was successful.
Type: ${parsed.type}.
Sender: ${parsed.sender}.`
}
