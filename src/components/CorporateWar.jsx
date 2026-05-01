/**
 * CorporateWar.jsx
 * 
 * A PVP component where a player's corporation can launch hostile actions 
 * (Espionage, Sabotage, Raids) against rival corporations.
 * Incorporates probability-based outcomes and detailed status feedback.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Bomb, Banknote, Shield, Swords, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import sounds from '../lib/soundManager'

// ── Master List of Hostile Actions ──
// Each action has a different cost-to-risk ratio.
const WAR_ACTIONS = [
  {
    key: 'espionage',
    icon: Eye,
    label: 'Corporate Espionage',
    description: 'Steal 5% of their business revenues for 2 hours.',
    cost: 10000,
    success_chance: 0.60, // 60% win rate
    color: '#B56EFF',
    emoji: '🕵️',
  },
  {
    key: 'sabotage',
    icon: Bomb,
    label: 'Business Sabotage',
    description: 'Cut target corp\'s passive income by 30% for 1 hour.',
    cost: 25000,
    success_chance: 0.45,
    color: '#FF6B6B',
    emoji: '💥',
  },
  {
    key: 'treasury_raid',
    icon: Banknote,
    label: 'Treasury Raid',
    description: 'Steal up to 10% of their corporation bank.',
    cost: 50000,
    success_chance: 0.30, // High risk, high reward
    color: '#F5C842',
    emoji: '💰',
  },
]

export default function CorporateWar({ myCorp, rivalCorps = [] }) {
  const [selectedAction, setSelectedAction] = useState(null)
  const [targetCorp, setTargetCorp] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const executeAction = async () => {
    if (!selectedAction || !targetCorp) return
    sounds.tap()
    setLoading(true)

    // Simulate RNG outcome locally for immediate feedback
    // In production, the backend edge function strictly enforces this roll
    const success = Math.random() < selectedAction.success_chance
    
    // Artificial delay to build suspense
    await new Promise(r => setTimeout(r, 1500))

    setResult({ success, action: selectedAction, corp: targetCorp })
    setLoading(false)

    // ── Database Sync ──
    try {
      await supabase.from('corporate_wars').insert({
        attacker_corp: myCorp?.id,
        defender_corp: targetCorp.id,
        action_type: selectedAction.key,
        status: success ? 'success' : 'failed',
        cost: selectedAction.cost,
        damage_amount: success ? selectedAction.cost * 0.5 : 0, // Simplified math
      })
    } catch { /* Demo fail-safe */ }
  }

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)' }}>
        <Swords size={18} style={{ color: '#FF6B6B' }} />
        <div>
          <div className="text-sm font-black" style={{ color: '#FF6B6B' }}>Corporate Warfare</div>
          <div className="text-xs" style={{ color: 'var(--col-text-3)' }}>Cripple rivals. Raid treasuries. Dominate the market.</div>
        </div>
      </div>

      {/* ── Step 1: Target Selection ── */}
      <div>
        <div className="text-[10px] font-black tracking-widest mb-2" style={{ color: 'var(--col-text-3)' }}>SELECT TARGET CORPORATION</div>
        {rivalCorps.length === 0 ? (
          <div className="text-center py-6" style={{ color: 'var(--col-text-3)' }}>
            <Shield size={24} className="mx-auto mb-2" />
            <p className="text-xs">No rival corporations found. Join a corporation first.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rivalCorps.map(corp => (
              <button key={corp.id} onClick={() => setTargetCorp(corp)}
                className="w-full text-left px-4 py-3 rounded-xl transition-all"
                style={{
                  background: targetCorp?.id === corp.id ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.04)',
                  border: targetCorp?.id === corp.id ? '1px solid rgba(255,107,107,0.4)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                <span className="text-sm font-bold" style={{ color: 'var(--col-text-1)' }}>
                  [{corp.tag}] {corp.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Step 2: Action Selection ── */}
      <div>
        <div className="text-[10px] font-black tracking-widest mb-2" style={{ color: 'var(--col-text-3)' }}>SELECT OPERATION</div>
        <div className="space-y-2">
          {WAR_ACTIONS.map(action => {
            const Icon = action.icon
            return (
              <button key={action.key} onClick={() => setSelectedAction(action)}
                className="w-full text-left rounded-2xl overflow-hidden"
                style={{
                  background: selectedAction?.key === action.key
                    ? `linear-gradient(135deg, ${action.color}18, rgba(13,14,22,0.95))`
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedAction?.key === action.key ? action.color + '50' : 'rgba(255,255,255,0.06)'}`,
                }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">{action.emoji}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold" style={{ color: 'var(--col-text-1)' }}>{action.label}</div>
                    <div className="text-xs" style={{ color: 'var(--col-text-3)' }}>{action.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black" style={{ color: action.color }}>
                      {Math.round(action.success_chance * 100)}% chance
                    </div>
                    <div className="text-xs" style={{ color: 'var(--col-text-3)' }}>
                      ${action.cost.toLocaleString()}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Step 3: Result Banner ── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="p-4 rounded-2xl text-center"
            style={{
              background: result.success ? 'rgba(61,214,140,0.12)' : 'rgba(255,107,107,0.12)',
              border: `1px solid ${result.success ? 'rgba(61,214,140,0.3)' : 'rgba(255,107,107,0.3)'}`,
            }}>
            <div className="text-2xl mb-1">{result.success ? '✅' : '❌'}</div>
            <div className="font-black" style={{ color: result.success ? '#3DD68C' : '#FF6B6B' }}>
              {result.success ? 'Operation Successful!' : 'Operation Failed — Detected!'}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--col-text-3)' }}>
              {result.success ? `${result.action.label} executed against ${result.corp.name}` : 'Your agents were caught. No damage dealt.'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Execute Button ── */}
      <motion.button
        whileTap={{ scale: 0.96, y: 2 }}
        onClick={executeAction}
        disabled={loading || !selectedAction || !targetCorp}
        className="w-full py-4 rounded-2xl font-black text-sm"
        style={{
          background: (loading || !selectedAction || !targetCorp)
            ? 'rgba(255,255,255,0.08)'
            : 'linear-gradient(180deg, #FF6B6B 0%, #C0392B 100%)', // Red aggressive styling
          boxShadow: (loading || !selectedAction || !targetCorp)
            ? 'none'
            : '0 6px 0 #8B2020, 0 8px 24px rgba(255,107,107,0.35)',
          color: (loading || !selectedAction || !targetCorp) ? 'var(--col-text-3)' : '#fff',
        }}
      >
        {loading ? '⚔️ Executing...' : selectedAction ? `${selectedAction.emoji} ${selectedAction.label} · $${selectedAction.cost.toLocaleString()}` : 'Select target & operation'}
      </motion.button>
    </div>
  )
}
