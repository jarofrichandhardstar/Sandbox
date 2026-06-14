export function formatAmount(
  amount: number,
  symbol: string,
  symbolBefore: boolean,
  decimals: number,
  thousandsSep: string,
  decimalSep: string,
): string {
  const fixed = amount.toFixed(decimals)
  const [intPart, decPart] = fixed.split('.')
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep)
  const numStr =
    decPart !== undefined && decimals > 0
      ? `${withThousands}${decimalSep}${decPart}`
      : withThousands
  return symbolBefore ? `${symbol} ${numStr}` : `${numStr} ${symbol}`
}
