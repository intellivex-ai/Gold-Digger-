/**
 * SparklineChart.jsx
 * 
 * A minimalistic "mini-chart" used in lists and cards to show a trend over time.
 * Unlike CandlestickChart, this uses 'recharts' to draw simple, smooth SVG area curves.
 * 
 * @param {Array}   data     – Array of data points: [{ value: 100 }, { value: 105 }]
 * @param {boolean} positive – If true, the chart is green. If false, it's red.
 * @param {number}  height   - Fixed height in pixels.
 */

import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts'

export default function SparklineChart({ data = [], positive = true, height = 60 }) {
  // Determine the theme colors based on the positive flag
  const color      = positive ? '#3DD68C' : '#FF5A5A'
  const glowColor  = positive ? 'rgba(61,214,140,0.5)' : 'rgba(255,90,90,0.5)'
  
  // We need a unique ID for the gradient so multiple charts on the same page
  // don't conflict with each other's SVG defs.
  const gradientId = `spark-${positive ? 'g' : 'r'}-${Math.random().toString(36).slice(2, 7)}`

  // Loading State: Show a shimmering placeholder box
  if (!data.length) {
    return (
      <div
        style={{
          height,
          borderRadius: 12,
          background: 'linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 75%)',
          backgroundSize: '400% 100%',
          animation: 'shimmer 1.8s linear infinite',
        }}
      />
    )
  }

  return (
    // Filter drop-shadow makes the entire SVG line glow
    <div style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          
          {/* Define the gradient fill for the area under the line */}
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>

          {/* Optional tooltip when hovering/tapping on the chart */}
          <Tooltip
            contentStyle={{
              background: '#1A1B28',
              border: `1px solid ${color}40`,
              borderRadius: 10,
              fontSize: 11,
              padding: '4px 10px',
              color: '#EEF0FF',
              boxShadow: `0 0 12px ${glowColor}`,
            }}
            formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']}
            labelFormatter={() => ''}
          />

          {/* The main data curve */}
          <Area
            type="monotone"     // Smooth, curved line (not jagged)
            dataKey="value"     // Maps to data[i].value
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}         // Don't show dots on every single point
            activeDot={{ r: 4, fill: color, stroke: 'var(--col-bg)', strokeWidth: 2 }} // Dot only shows on hover
            isAnimationActive
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
