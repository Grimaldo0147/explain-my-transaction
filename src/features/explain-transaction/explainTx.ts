export function explainTransaction(tx: any) {
  if (!tx) {
    return {
      summary: "Transaction could not be parsed.",
      type: "unknown",
      events: [],
      eventsCount: 0,
      postConditions: [],
      postConditionSummary: null,
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

  function normalizeContractName(contractId?: string | null) {
    if (!contractId) return null;

    const contractPart = contractId.split(".")[1] || contractId;
    const lower = contractPart.toLowerCase();

    if (lower.includes("velar")) return "Velar router";
    if (lower.includes("alex")) return "ALEX router";
    if (lower.includes("bitflow")) return "Bitflow router";
    if (lower.includes("arkadiko")) return "Arkadiko contract";
    if (lower.includes("zest")) return "Zest contract";
    if (lower.includes("granite")) return "Granite contract";
    if (lower.includes("stacking-dao") || lower.includes("stackingdao")) return "StackingDAO contract";
    if (lower.includes("wrapper")) return contractPart.replace(/-/g, " ");

    return contractPart.replace(/-/g, " ");
  }

  function detectProtocol(contractId?: string | null, functionName?: string | null) {
    const source = `${contractId || ""} ${functionName || ""}`.toLowerCase();

    if (source.includes("velar")) return "Velar";
    if (source.includes("alex")) return "ALEX";
    if (source.includes("bitflow")) return "Bitflow";
    if (source.includes("arkadiko")) return "Arkadiko";
    if (source.includes("zest")) return "Zest";
    if (source.includes("granite")) return "Granite";
    if (source.includes("stacking-dao") || source.includes("stackingdao")) return "StackingDAO";

    return null;
  }

  function isFailedStatus(status?: string | null) {
    const s = String(status || "").toLowerCase();
    return (
      s.includes("abort") ||
      s.includes("failed") ||
      s.includes("fail") ||
      s.includes("post_condition") ||
      s.includes("post-condition")
    );
  }

  function isPostConditionFailure(status?: string | null) {
    const s = String(status || "").toLowerCase();
    return s.includes("post_condition") || s.includes("post-condition");
  }

  function eventAmountLabel(ev: any) {
    if (!ev) return null;
    if (ev.amountStx) return `${ev.amountStx} STX`;
    if (ev.amountMicroStx) {
      const stx = microToStx(ev.amountMicroStx);
      return stx !== null ? `${stx} STX` : `${ev.amountMicroStx} microSTX`;
    }
    if (ev.amount) return String(ev.amount);
    return null;
  }

  function detectSwapFromEvents(events: any[]) {
    if (!Array.isArray(events) || events.length === 0) return null;

    const transfers = events.filter(
      (ev) =>
        ev &&
        (ev.kind === "stx_transfer" || ev.kind === "ft_transfer" || ev.kind === "token_transfer")
    );

    if (transfers.length < 2) return null;

    const first = transfers[0];
    const second = transfers[1];

    return {
      tokenIn: {
        asset: first.asset || "Asset",
        amount: first.amount ?? first.amountMicroStx ?? null,
        amountStx: first.amountStx ?? null,
      },
      tokenOut: {
        asset: second.asset || "Asset",
        amount: second.amount ?? second.amountMicroStx ?? null,
        amountStx: second.amountStx ?? null,
      },
      note: "Swap inferred from transaction events.",
    };
  }

  function normalizePostConditionMode(mode?: string | null) {
    const s = String(mode || "").toLowerCase();
    if (!s) return null;
    if (s === "allow") return "allow";
    if (s === "deny") return "deny";
    return s;
  }

  function buildPostConditionSummary(postConditions: any[], mode?: string | null, failed?: boolean) {
    if (!Array.isArray(postConditions) || postConditions.length === 0) return null;

    const normalizedMode = normalizePostConditionMode(mode);
    const first = postConditions[0];
    const firstRule = first?.summary || "This transaction included a safety rule.";

    let title = "Post conditions detected";
    let statusLabel = failed ? "Failed" : "Present";

    let summary = firstRule;

    if (failed) {
      title = "Post condition failure";
      statusLabel = "Failed";
      summary = `This transaction failed because one of its safety rules was not satisfied. ${firstRule}`;
    } else if (normalizedMode === "deny") {
      title = "Strict safety rules";
      summary = `This transaction used strict post conditions. ${firstRule}`;
    } else if (normalizedMode === "allow") {
      title = "Safety rules";
      summary = `This transaction included post conditions. ${firstRule}`;
    }

    if (postConditions.length > 1) {
      summary += ` It included ${postConditions.length} safety rules in total.`;
    }

    return {
      title,
      status: statusLabel,
      mode: normalizedMode,
      count: postConditions.length,
      summary,
      rules: postConditions.map((pc) => pc?.summary || "Post condition rule"),
    };
  }

  const type = tx.type || tx.tx_type || "unknown";
  const sender = tx.sender || tx.sender_address || null;
  const recipientOrTarget = tx.recipientOrTarget || null;
  const contract = tx.contractId || tx.contract || null;
  const functionName = tx.functionName || null;

  const feeMicro = tx.feeMicroStx ?? tx.fee ?? tx.fee_rate ?? null;
  const feeStx = tx.feeStx ?? microToStx(feeMicro);

  const amountMicro = tx.amountMicroStx ?? tx.amount ?? null;
  const amountStx = tx.amountStx ?? microToStx(amountMicro);

  const block = tx.blockHeight ?? tx.block_height ?? null;
  const time = tx.timestamp ?? tx.timeIso ?? tx.burn_block_time_iso ?? tx.block_time_iso ?? null;
  const status = tx.status ?? tx.tx_status ?? null;

  const events = Array.isArray(tx.events) ? tx.events : [];
  const eventsCount = events.length;

  const postConditions = Array.isArray(tx.postConditions) ? tx.postConditions : [];
  const postConditionMode = tx.postConditionMode ?? null;

  const prettyContractName = normalizeContractName(contract);
  const protocol = detectProtocol(contract, functionName);

  let swapSummary: any = null;

  if (type === "contract_call") {
    const lowerFn = String(functionName || "").toLowerCase();
    const looksLikeDex =
      Boolean(protocol && ["Velar", "ALEX", "Bitflow"].includes(protocol)) ||
      lowerFn.includes("swap") ||
      lowerFn.includes("route") ||
      lowerFn.includes("trade");

    if (looksLikeDex) {
      const fromEvents = detectSwapFromEvents(events);
      swapSummary = fromEvents
        ? {
            protocol: protocol || "DEX",
            ...fromEvents,
          }
        : {
            protocol: protocol || "DEX",
            note: "Possible swap detected through a DEX router contract.",
          };
    }
  }

  const failed = isFailedStatus(status);
  const failedByPostCondition = isPostConditionFailure(status);

  const fromLabel = shortAddr(sender);
  const toLabel = shortAddr(recipientOrTarget);
  const contractLabel = prettyContractName || "a smart contract";
  const feeLabel = feeStx !== null ? `${feeStx} STX in fees` : "a network fee";
  const amountLabel = amountStx !== null ? `${amountStx} STX` : "some STX";

  let summary = "This transaction was processed on the Stacks network.";

  if (failedByPostCondition && postConditions.length > 0) {
    const firstRule = postConditions[0]?.summary || "A safety rule was not satisfied.";
    summary = `This transaction failed because one of its post conditions was not satisfied. ${firstRule}`;
  } else if (failed) {
    if (type === "contract_call") {
      summary = `This transaction attempted to call ${contractLabel}${functionName ? ` (${functionName})` : ""}, but it failed.`;
    } else if (type === "token_transfer" || type === "stx_transfer") {
      summary = `This transaction attempted to transfer ${amountLabel} from ${fromLabel} to ${toLabel}, but it failed.`;
    } else {
      summary = "This transaction failed before completing successfully.";
    }
  } else if (type === "token_transfer") {
    summary = `You sent ${amountLabel} to ${toLabel}, paying ${feeLabel}.`;
  } else if (type === "stx_transfer") {
    summary = `You transferred ${amountLabel} to ${toLabel}.`;
  } else if (type === "contract_call") {
    if (swapSummary?.tokenIn && swapSummary?.tokenOut) {
      const inAmount = swapSummary.tokenIn.amountStx
        ? `${swapSummary.tokenIn.amountStx} STX`
        : swapSummary.tokenIn.amount
        ? `${swapSummary.tokenIn.amount} ${swapSummary.tokenIn.asset || ""}`.trim()
        : "an asset";

      const outAmount = swapSummary.tokenOut.amountStx
        ? `${swapSummary.tokenOut.amountStx} STX`
        : swapSummary.tokenOut.amount
        ? `${swapSummary.tokenOut.amount} ${swapSummary.tokenOut.asset || ""}`.trim()
        : "another asset";

      summary = `You swapped ${inAmount} for ${outAmount}${protocol ? ` on ${protocol}` : ""}, paying ${feeLabel}.`;
    } else if (protocol) {
      summary = `You called ${contractLabel}${functionName ? ` (${functionName})` : ""} on ${protocol}, paying ${feeLabel}.`;
    } else {
      summary = `You called ${contractLabel}${functionName ? ` (${functionName})` : ""}, paying ${feeLabel}.`;
    }
  } else if (type === "smart_contract") {
    summary = `You deployed ${contractLabel}, paying ${feeLabel}.`;
  } else if (type === "ft_transfer") {
    summary = `You transferred tokens${recipientOrTarget ? ` to ${toLabel}` : ""}.`;
  } else {
    const firstTransfer = events.find(
      (ev: any) => ev?.kind === "stx_transfer" || ev?.kind === "ft_transfer"
    );

    if (firstTransfer?.kind === "stx_transfer") {
      const firstAmount = eventAmountLabel(firstTransfer) || "some STX";
      const firstRecipient = shortAddr(firstTransfer.recipient || recipientOrTarget);
      summary = `This transaction transferred ${firstAmount} to ${firstRecipient}.`;
    } else if (firstTransfer?.kind === "ft_transfer") {
      const firstAmount = eventAmountLabel(firstTransfer) || "tokens";
      summary = `This transaction transferred ${firstAmount}${firstTransfer.asset ? ` of ${firstTransfer.asset}` : ""}.`;
    }
  }

  const postConditionSummary = buildPostConditionSummary(
    postConditions,
    postConditionMode,
    failedByPostCondition
  );

  return {
    summary,
    txid: tx.txid || tx.tx_id,
    type,
    status,
    feeStx,
    amountStx,
    sender,
    recipientOrTarget,
    contract,
    contractName: prettyContractName,
    functionName,
    blockHeight: block,
    timeIso: time,
    events,
    eventsCount,
    swapSummary,
    postConditionMode,
    postConditions,
    postConditionSummary,
  };
}