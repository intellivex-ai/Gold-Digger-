/**
 * Corporation.jsx
 * 
 * The main social/guild interface where players can create, join, and manage corporations.
 * Features include a shared treasury bank, member ranking, and initiating Corporate Warfare.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Building2, Wallet, UserPlus, ArrowDownToLine, Shield } from 'lucide-react'
import useSocialStore from '../stores/useSocialStore'
import useUserStore from '../stores/useUserStore'
import Card from '../components/Card'
import Button from '../components/Button'
import ProgressBar from '../components/ProgressBar'
import sounds from '../lib/soundManager'
import { CardSkeleton } from '../components/SkeletonLoader'
import { supabase } from '../lib/supabase'
import CorporateWar from '../components/CorporateWar'

// Quick helper to abbreviate large currency numbers
const fmtMoney = (n) => {
  n = parseFloat(n || 0)
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}k`
  return `$${n.toFixed(0)}`
}

export default function Corporation() {
  const corp             = useSocialStore((s) => s.corporation)
  const fetchCorporation = useSocialStore((s) => s.fetchCorporation)
  const user             = useUserStore((s) => s.user)

  // ── Auto-Subscribe to Corp Data ──
  useEffect(() => {
    const corpId = user?.corporation_id || user?.corporationId
    if (corpId) {
      fetchCorporation(corpId)
      // Connect to real-time channel to listen for member joins/deposits
      const unsubscribe = useSocialStore.getState().subscribeToCorporation(corpId)
      return () => unsubscribe()
    }
  }, [user?.corporation_id, user?.corporationId, fetchCorporation])

  // Local UI State
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm]         = useState({ name: '', tag: '' })
  const [loading, setLoading]               = useState(false)
  const [errorMsg, setErrorMsg]             = useState('')
  const [showFindList, setShowFindList]     = useState(false)
  const [availableCorps, setAvailableCorps] = useState([])
  const [loadingJoin, setLoadingJoin]       = useState(false)

  // ── Recruitment Actions ──
  const handleFind = async () => {
    sounds.tap?.()
    setShowFindList(true)
    const corps = await useSocialStore.getState().fetchAvailableCorporations()
    setAvailableCorps(corps || [])
  }

  const handleJoin = async (corpId) => {
    sounds.tap?.()
    setLoadingJoin(true)
    const result = await useSocialStore.getState().joinCorporation(corpId)
    setLoadingJoin(false)
    if (result.success) { 
      sounds.success?.()
      window.location.reload() // Force reload to apply new corp state
    } else { 
      sounds.error?.()
      alert(result.message || 'Failed to join') 
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault(); setLoading(true); setErrorMsg('')
    const result = await useSocialStore.getState().createCorporation(createForm.name, createForm.tag)
    setLoading(false)
    if (result.success) {
      sounds.success?.()
    } else { 
      sounds.error?.()
      setErrorMsg(result.message || 'Failed to create') 
    }
  }

  // ── UNAFFILIATED VIEW ──────────────────────────────────────────
  if (!corp) return (
    <div className="px-4 pt-5 space-y-4">
      {/* Empty State Banner */}
      <div className="text-center py-6">
        <div
          className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(91,156,246,0.15), rgba(91,156,246,0.05))',
            border: '1px solid rgba(91,156,246,0.25)',
            boxShadow: '0 0 24px rgba(91,156,246,0.15)',
          }}
        >
          <Building2 size={32} color="#5B9CF6" />
        </div>
        <h2 className="text-lg font-black mb-1" style={{ color: 'var(--col-text-1)' }}>
          No Corporation
        </h2>
        <p className="text-sm" style={{ color: 'var(--col-text-3)' }}>
          Join or create one to unlock team features
        </p>
      </div>

      {showFindList ? (
        // Search view
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black" style={{ color: 'var(--col-text-1)' }}>
              Available Corporations
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowFindList(false)}>Back</Button>
          </div>
          <div className="space-y-2">
            {availableCorps.length === 0 && (
              <p className="text-xs text-center py-6" style={{ color: 'var(--col-text-3)' }}>
                No corporations found
              </p>
            )}
            {availableCorps.map(c => {
              const count  = c.members?.[0]?.count || 0
              const isFull = count >= c.member_cap
              return (
                <div key={c.id}
                  className="flex justify-between items-center p-3 rounded-xl"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div>
                    <p className="text-sm font-black" style={{ color: 'var(--col-text-1)' }}>
                      {c.name} <span className="text-[10px] font-mono" style={{ color: 'var(--col-text-3)' }}>[{c.tag}]</span>
                    </p>
                    <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>
                      {count}/{c.member_cap} members
                    </p>
                  </div>
                  <Button variant={isFull ? 'ghost' : 'primary'} size="sm"
                    loading={loadingJoin} disabled={isFull}
                    onClick={() => handleJoin(c.id)}>
                    {isFull ? 'Full' : 'Join'}
                  </Button>
                </div>
              )
            })}
          </div>
        </Card>
      ) : !showCreateForm ? (
        // Action Buttons
        <div className="space-y-3">
          <motion.button className="btn-game-blue w-full" style={{ paddingTop: 14, paddingBottom: 14 }}
            whileTap={{ y: 2, scale: 0.98 }} onClick={handleFind}>
            <Building2 size={18} /> Find a Corporation
          </motion.button>
          <motion.button className="btn-game-ghost w-full" style={{ paddingTop: 14, paddingBottom: 14 }}
            whileTap={{ y: 1, scale: 0.98 }}
            onClick={() => { sounds.tap?.(); setShowCreateForm(true) }}>
            <Users size={18} /> Create Corporation
          </motion.button>
        </div>
      ) : (
        // Creation Form
        <Card>
          <h3 className="text-sm font-black mb-4" style={{ color: 'var(--col-text-1)' }}>
            Found a New Corporation
          </h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input placeholder="Corporation Name (e.g. Acme Corp)"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required className="input-dark" />
            <input placeholder="Tag (e.g. ACME) — max 4 chars"
              value={createForm.tag} maxLength={4}
              onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value.toUpperCase() })}
              required className="input-dark uppercase" />
            
            {errorMsg && <p className="text-xs font-bold" style={{ color: 'var(--col-red)' }}>{errorMsg}</p>}
            
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="md" className="flex-1"
                onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <motion.button type="submit" className="btn-game-gold flex-1"
                style={{ paddingTop: 10, paddingBottom: 10 }} whileTap={{ y: 2 }}>
                {loading
                  ? <span className="w-4 h-4 border-2 border-[#1A1200]/50 border-t-[#1A1200] rounded-full animate-spin" />
                  : 'Create'}
              </motion.button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )

  // ── AFFILIATED VIEW (Has Corporation) ───────────────────────────
  const members         = corp.members || []
  // Find highest contribution to calculate relative progress bar widths
  const topContribution = Math.max(...members.map((m) => m.contribution || 0), 1)
  const bankBalance     = parseFloat(corp.bank || corp.bankBalance || 0)
  const membersCount    = corp.membersCount || members.length
  const membersMax      = corp.membersMax || corp.member_cap || 20

  // ── Corp Actions ──
  const handleDeposit = async () => {
    sounds.tap?.()
    const amountStr = window.prompt('Deposit amount ($):')
    if (!amountStr) return
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) return alert('Invalid amount')
    
    const result = await useSocialStore.getState().depositToCorporation(corp.id, amount)
    if (result.success) {
      sounds.success?.()
    } else { 
      sounds.error?.()
      alert(result.message || 'Deposit failed') 
    }
  }

  const handleInvite = async () => {
    sounds.tap?.()
    const targetUsername = window.prompt('Enter exact username to invite:')
    if (!targetUsername) return
    const { data, error } = await supabase.from('profiles').select('id').eq('username', targetUsername).single()
    if (error || !data) { sounds.error?.(); return alert('User not found') }
    
    const result = await useSocialStore.getState().inviteMember(corp.id, data.id)
    if (result.success) { 
      sounds.success?.()
      alert('Invitation sent!') 
    } else { 
      sounds.error?.()
      alert(result.message || 'Failed to send invite') 
    }
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* ── Corp Hero Card ── */}
      <div
        className="relative rounded-2xl overflow-hidden p-5"
        style={{
          background: 'linear-gradient(135deg, #091630 0%, #0D1F3C 50%, #091630 100%)',
          border: '1px solid rgba(91,156,246,0.25)',
          boxShadow: '0 0 32px rgba(91,156,246,0.12), 0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(91,156,246,0.15) 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(91,156,246,0.15)',
                border: '1px solid rgba(91,156,246,0.30)',
                boxShadow: '0 0 16px rgba(91,156,246,0.25)',
              }}
            >
              <Building2 size={26} color="#5B9CF6" />
            </div>
            <div>
              <h2 className="text-xl font-black" style={{ color: '#fff' }}>{corp.name}</h2>
              <span
                className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(91,156,246,0.15)',
                  border: '1px solid rgba(91,156,246,0.30)',
                  color: '#5B9CF6',
                }}
              >
                [{corp.tag}]
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Bank', value: fmtMoney(bankBalance), color: '#F5C842' },
              { label: 'Members', value: `${membersCount}/${membersMax}`, color: '#5B9CF6' },
              { label: 'Rank', value: `#${corp.rank || '?'}`, color: '#B56EFF' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center rounded-xl py-2"
                style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[9px] font-black tracking-widest uppercase mb-1"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
                <p className="text-sm font-black nums"
                  style={{ color, textShadow: `0 0 8px ${color}50` }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button className="btn-game-ghost" whileTap={{ y: 1 }} onClick={handleInvite}>
          <UserPlus size={16} /> Invite
        </motion.button>
        <motion.button className="btn-game-gold" whileTap={{ y: 2 }} onClick={handleDeposit}>
          <ArrowDownToLine size={16} /> Deposit
        </motion.button>
      </div>

      {/* ── Members List ── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Users size={14} color="#5B9CF6" />
          <h3 className="text-sm font-black" style={{ color: 'var(--col-text-1)' }}>
            Members ({membersCount})
          </h3>
        </div>
        <div className="space-y-4">
          {members.map((member, i) => {
            const profile      = member.profile || {}
            const username     = profile.username || member.username || 'Unknown'
            const level        = profile.level || member.level || 1
            const cash         = parseFloat(profile.cash || 0)
            const contribution = parseFloat(member.contribution || 0)

            return (
              <motion.div key={member.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(91,156,246,0.20), rgba(91,156,246,0.08))',
                      border: '1px solid rgba(91,156,246,0.25)',
                      color: '#5B9CF6',
                    }}
                  >
                    {username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black truncate" style={{ color: 'var(--col-text-1)' }}>
                        {username}
                      </span>
                      <span
                        className="text-[9px] font-black px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                        style={{
                          background: 'rgba(91,156,246,0.12)',
                          border: '1px solid rgba(91,156,246,0.25)',
                          color: '#5B9CF6',
                        }}
                      >
                        {member.role}
                      </span>
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--col-text-3)' }}>
                      Lv.{level} · {fmtMoney(cash)} NW
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-black nums" style={{ color: '#3DD68C' }}>
                      +{fmtMoney(contribution)}
                    </span>
                    <p className="text-[9px]" style={{ color: 'var(--col-text-3)' }}>Contributed</p>
                  </div>
                </div>
                {/* Visual indicator of member's relative financial impact on the corp */}
                <ProgressBar value={contribution / topContribution} color="blue" />
              </motion.div>
            )
          })}
        </div>
      </Card>

      {/* ── Corporate Warfare Hub ── */}
      <Card>
        <p className="text-[10px] font-black tracking-widest uppercase mb-4"
          style={{ color: 'var(--col-text-3)' }}>Corporate Warfare</p>
        <CorporateWar
          myCorp={corp}
          rivalCorps={[]} // Feature stub: Would fetch from Supabase in prod
        />
      </Card>
    </div>
  )
}
