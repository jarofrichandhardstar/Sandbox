import { useContent } from '../context/ContentContext'
import { formatAmount } from '../utils/currency'

export function useCurrency() {
  const { get } = useContent()

  const symbol       = get('currency_symbol',             'Rp')
  const position     = get('currency_symbol_position',    'before')
  const decimals     = Math.max(0, parseInt(get('currency_decimal_places',      '0')) || 0)
  const thousandsSep = get('currency_thousands_separator', '.')
  const decimalSep   = get('currency_decimal_separator',   ',')
  const code         = get('currency_code',                'IDR')

  const format = (amount: number) =>
    formatAmount(amount, symbol, position === 'before', decimals, thousandsSep, decimalSep)

  return { format, symbol, code }
}
