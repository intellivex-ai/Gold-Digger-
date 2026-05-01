import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const SKILL_TREES_MOCK = {
  wolf: [
    { node_key: 'wolf_1', label: 'Market Instinct', description: 'Stock buy fees -5%', icon: 'trending-up', cost_points: 1, requires: null, effect_type: 'stock_fee_discount', effect_value: 0.05 },
    { node_key: 'wolf_2', label: 'Insider Edge',    description: 'Stock buy cost -10%',icon: 'eye',        cost_points: 2, requires: 'wolf_1', effect_type: 'stock_fee_discount', effect_value: 0.10 },
    { node_key: 'wolf_3', label: 'Flash Trader',    description: 'Unlock limit orders',icon: 'zap',        cost_points: 3, requires: 'wolf_2', effect_type: 'unlock_limit_orders', effect_value: 1 },
    { node_key: 'wolf_4', label: 'The Oracle',      description: '48h stock forecast', icon: 'star',       cost_points: 4, requires: 'wolf_3', effect_type: 'stock_forecast', effect_value: 1 },
  ],
  tycoon: [
    { node_key: 'tycoon_1', label: 'Lean Ops',       description: 'Business revenue +5%',  icon: 'briefcase', cost_points: 1, requires: null,      effect_type: 'passive_boost', effect_value: 0.05 },
    { node_key: 'tycoon_2', label: 'Efficiency',     description: 'Business revenue +10%', icon: 'trending-up',cost_points: 2, requires: 'tycoon_1', effect_type: 'passive_boost', effect_value: 0.10 },
    { node_key: 'tycoon_3', label: 'C-Suite Access', description: 'Unlock C-Suite managers',icon: 'users',   cost_points: 3, requires: 'tycoon_2', effect_type: 'unlock_csuite', effect_value: 1 },
    { node_key: 'tycoon_4', label: 'Empire Mode',    description: 'All passive +25%',      icon: 'crown',    cost_points: 5, requires: 'tycoon_3', effect_type: 'passive_boost', effect_value: 0.25 },
  ],
  shadow: [
    { node_key: 'shadow_1', label: 'Street Smarts',  description: 'Black market bust -10%', icon: 'shield', cost_points: 1, requires: null,      effect_type: 'bm_risk_reduce', effect_value: 0.10 },
    { node_key: 'shadow_2', label: 'Ghost Protocol', description: 'Crypto trades tax-free', icon: 'ghost',  cost_points: 2, requires: 'shadow_1', effect_type: 'crypto_tax_free', effect_value: 1 },
    { node_key: 'shadow_3', label: 'Dark Connections',description: 'Rare BM items unlocked',icon: 'skull',  cost_points: 3, requires: 'shadow_2', effect_type: 'unlock_rare_bm', effect_value: 1 },
  ],
  kingpin: [
    { node_key: 'kingpin_1', label: 'War Chest',    description: 'Takeover cost -10%',     icon: 'swords',  cost_points: 1, requires: null,       effect_type: 'takeover_discount', effect_value: 0.10 },
    { node_key: 'kingpin_2', label: 'Iron Curtain', description: 'Defense +15%',           icon: 'shield',  cost_points: 2, requires: 'kingpin_1',effect_type: 'defense_boost', effect_value: 0.15 },
    { node_key: 'kingpin_3', label: 'Corporate Spy',description: 'Espionage success +20%', icon: 'eye',     cost_points: 3, requires: 'kingpin_2',effect_type: 'espionage_boost', effect_value: 0.20 },
  ],
}

const useSkillStore = create(persist((set, get) => ({
  trees: SKILL_TREES_MOCK,
  unlockedNodes: [],  // ['wolf_1', 'tycoon_1', ...]
  talentPoints: 0,
  isLoading: false,

  fetchSkills: async (userId) => {
    if (!userId) return
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('player_skills')
        .select('node_key')
        .eq('user_id', userId)
      if (error) throw error
      set({ unlockedNodes: (data || []).map(r => r.node_key), isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  unlockNode: async (userId, nodeKey, talentPoints) => {
    const { unlockedNodes, trees } = get()
    if (unlockedNodes.includes(nodeKey)) return { success: false, message: 'Already unlocked' }

    const node = Object.values(trees).flat().find(n => n.node_key === nodeKey)
    if (!node) return { success: false, message: 'Node not found' }
    if (node.requires && !unlockedNodes.includes(node.requires)) return { success: false, message: 'Prerequisite not met' }
    if (talentPoints < node.cost_points) return { success: false, message: 'Not enough talent points' }

    try {
      const { error } = await supabase.from('player_skills').insert({ user_id: userId, node_key: nodeKey })
      if (error) throw error
    } catch { /* demo mode — proceed anyway */ }

    set(s => ({ unlockedNodes: [...s.unlockedNodes, nodeKey], talentPoints: s.talentPoints - node.cost_points }))
    return { success: true }
  },

  setTalentPoints: (pts) => set({ talentPoints: pts }),

  hasEffect: (effectType) => {
    const { unlockedNodes, trees } = get()
    return Object.values(trees).flat().some(
      n => unlockedNodes.includes(n.node_key) && n.effect_type === effectType
    )
  },

  getEffectTotal: (effectType) => {
    const { unlockedNodes, trees } = get()
    return Object.values(trees).flat()
      .filter(n => unlockedNodes.includes(n.node_key) && n.effect_type === effectType)
      .reduce((sum, n) => sum + parseFloat(n.effect_value), 0)
  },

  isUnlocked: (nodeKey) => get().unlockedNodes.includes(nodeKey),
  canUnlock: (nodeKey) => {
    const { unlockedNodes, trees, talentPoints } = get()
    const node = Object.values(trees).flat().find(n => n.node_key === nodeKey)
    if (!node) return false
    if (unlockedNodes.includes(nodeKey)) return false
    if (node.requires && !unlockedNodes.includes(node.requires)) return false
    return talentPoints >= node.cost_points
  },
}), { name: 'skills-storage' }))

export default useSkillStore
