export function explainParsedTx(parsed: any) {
  // Keep it simple for now. We’ll upgrade this later.
  const type = parsed?.txType ?? parsed?.type ?? "unknown";
  const sender = parsed?.sender ?? parsed?.originator ?? "unknown";

  return {
    summary: `This is a ${type} transaction submitted by ${sender}.`,
    details: parsed,
  };
}
