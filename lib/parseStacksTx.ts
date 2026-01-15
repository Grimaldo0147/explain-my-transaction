export function parseStacksTx(txData: any) {
  // Common fields
  const base = {
    txid: txData.tx_id,
    sender: txData.sender_address,
    fee: txData.fee_rate,
    blockHeight: txData.block_height ?? "Pending",
    status: txData.tx_status,
  }

  // -------------------------
  // Token transfer transaction
  // -------------------------
  if (txData.tx_type === "token_transfer") {
    return {
      ...base,
      type: "token_transfer",
      receiver: txData.token_transfer?.recipient_address,
      amount: txData.token_transfer?.amount,
      asset: txData.token_transfer?.asset_identifier,
    }
  }

  // -------------------------
  // Contract call transaction
  // -------------------------
  if (txData.tx_type === "contract_call") {
    return {
      ...base,
      type: "contract_call",
      contractCall: {
        contract: `${txData.contract_call.contract_address}.${txData.contract_call.contract_name}`,
        function: txData.contract_call.function_name,
        args: txData.contract_call.function_args?.map(
          (arg: any) => arg.repr
        ) ?? [],
      },
    }
  }

  // -------------------------
  // Fallback for other tx types
  // -------------------------
  return {
    ...base,
    type: txData.tx_type,
  }
}
