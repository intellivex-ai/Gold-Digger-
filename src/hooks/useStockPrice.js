import { useEffect, useRef } from 'react'
import useMarketStore from '../stores/useMarketStore'

/**
 * Returns a single stock object by symbol from the live store.
 */
export function useStockPrice(symbol) {
  const stock = useMarketStore((s) => s.stocks.find((st) => st.symbol === symbol))
  return stock || null
}

