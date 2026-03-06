export function explainTransaction(tx: any) {
  if (!tx) {
    return {
      summary: "Transaction could not be parsed.",
      type: "unknown",
      events: [],
      eventsCount: 0,
    };
  }

  function shortAddr(addr?: string | null) {
    if (!addr) return "";
    if (addr.length <= 14) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function microToStx(value?: string | number | null) {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return num / 1_000_000;
  }

  function formatStx(value?: string | number | null) {
    const stx = microToStx(value);
    if (stx === null) return null;
    return `${stx} STX`;
  }

  function normalizeContractName(contractId?: string | null) {
    if (!contractId) return null;

    const contractPart = contractId.split(".")[1] || contractId;
    const lower = contractPart.toLowerCase();

    if (lower.includes("velar")) return "Velar router";
    if (lower.includes("alex")) return "ALEX router";
    if (lower.includes("bitflow")) return "Bitflow router";
    if (lower.includes("arkadiko")) return "Arkadiko contract";
    if (lower.includes("zest")) return "Zest contract";
    if (lower.includes("wrapper")) return contractPart.replace(/-/g, " ");

    return contractPart.replace(/-/g, " ");
  }

  const type = tx.tx_type || "unknown";
  const sender = tx.sender_address || null;
  const feeMicro =
    tx.fee ??
    tx.fee_rate ??
    null;

  const feeStx = microToStx(feeMicro);
  const feeLabel = feeStx !== null ? `${feeStx} STX` : "a network fee";

  const block = tx.block_height || null;
  const time = tx.burn_block_time_iso || tx.block_time_iso || null;
  const status = tx.tx_status || null;

  let recipient = null;
  let contract = null;
  let functionName = null;
  let amountMicro = null;

  if (type === "token_transfer") {
    recipient = tx.token_transfer?.recipient_address || null;
    amountMicro = tx.token_transfer?.amount || null;
  }

  if (type === "contract_call") {
    contract = tx.contract_call?.contract_id || null;
    functionName = tx.contract_call?.function_name || null;
  }

  if (type === "smart_contract") {
    contract = tx.smart_contract?.contract_id || null;
  }

  const amountStx = microToStx(amountMicro);

  const events = Array.isArray(tx.events) ? tx.events : [];
  const eventsCount = events.length;

  // Basic protocol detection
  const prettyContractName = normalizeContractName(contract);

  // Basic swap detection
  let swapSummary: any = null;

  if (type === "contract_call" && contract) {
    const lowerContract = contract.toLowerCase();
    const lowerFn = String(functionName || "").toLowerCase();

    const looksLikeDex =
      lowerContract.includes("velar") ||
      lowerContract.includes("alex") ||
      lowerContract.includes("bitflow") ||
      lowerFn.includes("swap");

    if (looksLikeDex) {
      swapSummary = {
        protocol:
          lowerContract.includes("velar")
            ? "Velar"
            : lowerContract.includes("alex")
            ? "ALEX"
            : lowerContract.includes("bitflow")
            ? "Bitflow"
            : "DEX",
        note: "Possible swap detected through a DEX router contract.",
      };
    }
  }

  let summary = "This transaction was processed on the Stacks network.";

  if (type === "token_transfer") {
    const fromLabel = shortAddr(sender);
    const toLabel = shortAddr(recipient);
    const amtLabel = amountStx !== null ? `${amountStx} STX` : "some STX";

    summary = `This transaction sent ${amtLabel} from ${fromLabel} to ${toLabel}, paying ${feeLabel} in fees.`;
  } else if (type === "contract_call") {
    const contractLabel = prettyContractName || "a smart contract";
    const fromLabel = shortAddr(sender);

    if (swapSummary) {
      summary = `This transaction likely executed a swap through ${swapSummary.protocol}, submitted by ${fromLabel}, and paid ${feeLabel} in fees.`;
    } else {
      summary = `This transaction executed a contract call to ${contractLabel}, submitted by ${fromLabel}, paying ${feeLabel} in fees.`;
    }
  } else if (type === "smart_contract") {
    const contractLabel = prettyContractName || "a smart contract";
    const fromLabel = shortAddr(sender);
    summary = `This transaction deployed ${contractLabel}, submitted by ${fromLabel}, and paid ${feeLabel} in fees.`;
  }

  return {
    summary,
    txid: tx.tx_id,
    type,
    status,
    feeStx,
    amountStx,
    sender,
    recipientOrTarget: recipient || contract || null,
    contract,
    contractName: prettyContractName,
    functionName,
    blockHeight: block,
    timeIso: time,
    events,
    eventsCount,
    swapSummary,
  };
}