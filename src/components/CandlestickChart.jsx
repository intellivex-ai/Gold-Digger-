/**
 * CandlestickChart.jsx
 * 
 * A professional trading chart component.
 * Uses the high-performance 'lightweight-charts' library by TradingView.
 * This component is used in the Stock details page to show historical price movements.
 */

import { useLayoutEffect, useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'

export default function CandlestickChart({ data, liveCandle, height = 300 }) {
  // Refs to hold instances so we can update/cleanup without re-rendering
  const containerRef = useRef(null)
  const chartRef     = useRef(null)
  const seriesRef    = useRef(null)
  
  // Track if we have already auto-zoomed the chart to fit the data on load
  const hasFittedRef = useRef(false)

  // 1. Initialize the Chart
  useLayoutEffect(() => {
    if (!containerRef.current) return

    // Create the main chart instance and configure the grid, axes, and colors
    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#4A5580',           // --col-text-3
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        autoScale: true, // Automatically scale the Y axis based on the visible candles
      },
      crosshair: {
        // The crosshair appears when you tap/hover on the chart to inspect a specific candle
        vertLine: { color: 'rgba(245,200,66,0.35)', labelBackgroundColor: '#C49B20' },
        horzLine: { color: 'rgba(245,200,66,0.35)', labelBackgroundColor: '#C49B20' },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale:  { axisPressedMouseMove: true, mouseWheel: true },
    })

    // Add the specific "Candlestick" drawing type to the chart
    const series = chart.addCandlestickSeries({
      upColor:       '#3DD68C',   // --col-green
      downColor:     '#FF5A5A',   // --col-red
      borderVisible: false,       // We turn off borders for a cleaner, modern look
      wickUpColor:   '#3DD68C',
      wickDownColor: '#FF5A5A',
    })

    // Store references
    chartRef.current  = chart
    seriesRef.current = series

    // Responsive Design: If the user resizes the window or rotates their phone,
    // we need to tell the canvas to redraw at the new width.
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    
    window.addEventListener('resize', handleResize)
    const ro = new ResizeObserver(handleResize)
    ro.observe(containerRef.current)

    // Cleanup when the component unmounts
    return () => {
      window.removeEventListener('resize', handleResize)
      ro.disconnect()
      chart.remove()
    }
  }, [height])

  // 2. Set the Historical Data
  useEffect(() => {
    if (seriesRef.current && data?.length > 0) {
      seriesRef.current.setData(data)
      
      // Auto-zoom the chart so all candles are visible the first time it loads
      if (!hasFittedRef.current) {
        requestAnimationFrame(() => {
          chartRef.current?.timeScale().fitContent()
          hasFittedRef.current = true
        })
      }
    }
  }, [data])

  // 3. Update the Live "Current" Candle
  // This runs very frequently when live data streams in from Supabase
  useEffect(() => {
    if (seriesRef.current && liveCandle) {
      // .update() will either modify the current candle or append a new one
      // depending on the timestamp provided.
      seriesRef.current.update(liveCandle)
    }
  }, [liveCandle])

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height, background: 'transparent' }}
    >
      {/* Show a pulsing placeholder if data hasn't arrived yet */}
      {(!data || !data.length) && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-bold tracking-widest uppercase z-10"
          style={{ color: 'var(--col-text-3)', background: 'rgba(0,0,0,0.2)' }}
        >
          <span className="animate-pulse">Initializing chart…</span>
        </div>
      )}
      
      {/* The actual canvas container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
