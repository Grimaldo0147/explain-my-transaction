export function explainParsedTx(parsed: any) {
  if (parsed.type === "token_transfer") {
    if (parsed.receiver) {
      return `This transaction successfully transferred tokens from ${parsed.sender} to ${parsed.receiver}.`
    }

    return `This transaction successfully transferred tokens from ${parsed.sender}.`
  }

  if (parsed.type === "contract_call") {
    return `This transaction called a smart contract function.`
  }

  return "This transaction type is not yet supported."
}
