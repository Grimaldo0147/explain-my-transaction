export function parseStacksTx(tx: any) {
    return {
      txid: tx.tx_id,
      status: tx.tx_status,
      sender: tx.sender_address,
      fee: tx.fee_rate,
      type: tx.tx_type,
      blockHeight: tx.block_height ?? "Pending",
  
      contractCall: tx.contract_call
        ? {
            contract: tx.contract_call.contract_id,
            function: tx.contract_call.function_name,
            args: tx.contract_call.function_args.map((arg: any) => arg.repr),
          }
        : null,
  
      error:
        tx.tx_status === "failed"
          ? tx.tx_result?.repr || "Unknown error"
          : null,
    }
  }
    