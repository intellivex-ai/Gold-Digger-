import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts'

/**
 * SparklineChart – dark-themed area chart for profit history.
 * @param {Array}   data     – [{ value }]
 * @param {boolean} positive – green or red
 * @param {number}  height
 */
export default function SparklineChart({ data = [], positive = true, height = 60 }) {
  const color      = positive ? '#3DD68C' : '#FF5A5A'
  const glowColor  = positive ? 'rgba(61,214,140,0.5)' : 'rgba(255,90,90,0.5)'
  const gradientId = `spark-${positive ? 'g' : 'r'}-${Math.random().toString(36).slice(2, 7)}`

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
    <div style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
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
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: 'var(--col-bg)', strokeWidth: 2 }}
            isAnimationActive
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
