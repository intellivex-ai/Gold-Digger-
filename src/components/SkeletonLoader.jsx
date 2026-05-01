/**
 * SkeletonLoader.jsx
 * 
 * Instead of showing a boring spinning wheel when data is loading, we show "Skeletons".
 * Skeletons are grey boxes that mimic the shape of the UI that is about to load.
 * This prevents the page from "jumping around" when data arrives, improving perceived speed.
 */

/**
 * The base building block. It renders a dark grey box with a CSS animation
 * that sweeps a lighter gradient left-to-right (the "shimmer" effect).
 */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
          backgroundSize: '400% 100%',
        }}
      />
    </div>
  )
}

// ── Specific Page Layouts ────────────────────────────────────────────────────────
// These assemble multiple Skeleton blocks to look like the actual pages.

/** Skeleton mimicking the Home Dashboard (Wallet, stats, quick actions) */
export function DashboardSkeleton() {
  return (
    <div className="px-4 pt-5 pb-4 space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="w-11 h-11 rounded-2xl" />
      </div>
      {/* Wallet Card */}
      <Skeleton className="h-44 rounded-2xl" />
      {/* Buttons */}
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-16 rounded-[18px]" />
      <Skeleton className="h-10 rounded-xl" />
      {/* List items */}
      <div className="space-y-2">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </div>
  )
}

/** Skeleton mimicking the Stock/Crypto Market list */
export function MarketSkeleton() {
  return (
    <div className="px-4 pt-4 space-y-2">
      <Skeleton className="h-11 rounded-xl mb-4" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  )
}

/** Skeleton mimicking the Social Leaderboard podium */
export function LeaderboardSkeleton() {
  return (
    <div className="px-4 pt-4 space-y-2">
      {/* 3-tier Podium */}
      <div className="flex items-end justify-center gap-4 mb-6">
        <Skeleton className="w-24 h-32 rounded-2xl" />
        <Skeleton className="w-24 h-44 rounded-2xl" />
        <Skeleton className="w-24 h-24 rounded-2xl" />
      </div>
      {/* List items below podium */}
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  )
}

/** Skeleton mimicking the Business Empire list */
export function BusinessesSkeleton() {
  return (
    <div className="px-4 pt-5 space-y-3">
      {/* Title & Filter Button */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
      {/* List of businesses */}
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[76px] rounded-2xl" />
      ))}
    </div>
  )
}

/** Reusable generic card skeleton */
export function CardSkeleton({ className = 'h-20' }) {
  return <Skeleton className={`rounded-2xl ${className}`} />
}
