import { useLayoutEffect, useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'

export default function CandlestickChart({ data, liveCandle, height = 300 }) {
  const containerRef = useRef(null)
  const chartRef     = useRef(null)
  const seriesRef    = useRef(null)
  const hasFittedRef = useRef(false)

  useLayoutEffect(() => {
    if (!containerRef.current) return

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
        autoScale: true,
      },
      crosshair: {
        vertLine: { color: 'rgba(245,200,66,0.35)', labelBackgroundColor: '#C49B20' },
        horzLine: { color: 'rgba(245,200,66,0.35)', labelBackgroundColor: '#C49B20' },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale:  { axisPressedMouseMove: true, mouseWheel: true },
    })

    const series = chart.addCandlestickSeries({
      upColor:       '#3DD68C',   // --col-green
      downColor:     '#FF5A5A',   // --col-red
      borderVisible: false,
      wickUpColor:   '#3DD68C',
      wickDownColor: '#FF5A5A',
    })

    chartRef.current  = chart
    seriesRef.current = series

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)
    const ro = new ResizeObserver(handleResize)
    ro.observe(containerRef.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      ro.disconnect()
      chart.remove()
    }
  }, [height])

  useEffect(() => {
    if (seriesRef.current && data?.length > 0) {
      seriesRef.current.setData(data)
      if (!hasFittedRef.current) {
        requestAnimationFrame(() => {
          chartRef.current?.timeScale().fitContent()
          hasFittedRef.current = true
        })
      }
    }
  }, [data])

  useEffect(() => {
    if (seriesRef.current && liveCandle) {
      seriesRef.current.update(liveCandle)
    }
  }, [liveCandle])

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height, background: 'transparent' }}
    >
      {(!data || !data.length) && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-bold tracking-widest uppercase z-10"
          style={{ color: 'var(--col-text-3)', background: 'rgba(0,0,0,0.2)' }}
        >
          <span className="animate-pulse">Initializing chart…</span>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
