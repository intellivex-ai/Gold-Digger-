import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock, Check, ChevronRight, Zap, TrendingUp, Eye, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useSkillStore from '../stores/useSkillStore'
import useUserStore from '../stores/useUserStore'
import Card from '../components/Card'
import ProgressBar from '../components/ProgressBar'

const TREES = [
  {
    id: 'wolf',
    name: 'Wolf',
    tagline: 'Aggressive Growth',
    icon: Zap,
    color: '#FF6B6B',
    skills: [
      { id: 'w1', name: 'Hostile Bid',    desc: 'Takeover costs -10%',   cost: 1 },
      { id: 'w2', name: 'Market Predator', desc: 'Stock profits +15%',   cost: 2 },
      { id: 'w3', name: 'Alpha Strike',   desc: 'War power +25%',        cost: 3 },
    ],
  },
  {
    id: 'tycoon',
    name: 'Tycoon',
    tagline: 'Passive Income',
    icon: TrendingUp,
    color: '#F5C842',
    skills: [
      { id: 't1', name: 'Efficiency',     desc: 'Business income +10%',  cost: 1 },
      { id: 't2', name: 'Automation',     desc: 'Offline earnings +25%', cost: 2 },
      { id: 't3', name: 'Empire Mind',    desc: 'All income +20%',       cost: 3 },
    ],
  },
  {
    id: 'shadow',
    name: 'Shadow',
    tagline: 'Black Market',
    icon: Eye,
    color: '#B56EFF',
    skills: [
      { id: 's1', name: 'Contacts',       desc: 'Market risk -15%',       cost: 1 },
      { id: 's2', name: 'Ghost Network',  desc: 'Black market yield +20%',cost: 2 },
      { id: 's3', name: 'Phantom Deal',   desc: 'Offshore fees -50%',     cost: 3 },
    ],
  },
  {
    id: 'kingpin',
    name: 'Kingpin',
    tagline: 'Corp Control',
    icon: Shield,
    color: '#5B9CF6',
    skills: [
      { id: 'k1', name: 'Iron Grip',      desc: 'Corp defense +20%',      cost: 1 },
      { id: 'k2', name: 'War Council',    desc: 'Corp ops success +15%',  cost: 2 },
      { id: 'k3', name: 'Supreme Power',  desc: 'All corp bonuses +25%',  cost: 3 },
    ],
  },
]

export default function SkillTree() {
  const navigate      = useNavigate()
  const { unlockedSkills, unlockSkill, fetchSkills } = useSkillStore()
  const talentPoints  = useUserStore((s) => parseInt(s.user?.talent_points || 0))

  useEffect(() => { fetchSkills?.() }, [])

  return (
    <div className="page-scroll">
      <div className="px-4 pt-5 pb-24 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft size={16} style={{ color: 'var(--col-text-1)' }} />
          </motion.button>
          <div>
            <h1 className="font-black text-xl" style={{ color: 'var(--col-text-1)' }}>Skill Tree</h1>
            <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>Unlock permanent bonuses</p>
          </div>
          <div
            className="ml-auto px-3 py-1.5 rounded-xl flex items-center gap-1.5"
            style={{ background: 'rgba(245,200,66,0.12)', border: '1px solid rgba(245,200,66,0.25)' }}
          >
            <Zap size={12} style={{ color: '#F5C842' }} />
            <span className="text-xs font-black nums" style={{ color: '#F5C842' }}>{talentPoints} pts</span>
          </div>
        </div>

        {/* Trees */}
        {TREES.map(tree => {
          const Icon = tree.icon
          return (
            <Card key={tree.id}>
              {/* Tree header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${tree.color}18`, border: `1px solid ${tree.color}30` }}
                >
                  <Icon size={18} style={{ color: tree.color }} />
                </div>
                <div>
                  <p className="font-black text-base" style={{ color: 'var(--col-text-1)' }}>{tree.name}</p>
                  <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>{tree.tagline}</p>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                {tree.skills.map((skill, idx) => {
                  const isUnlocked = unlockedSkills?.includes(skill.id)
                  const prevUnlocked = idx === 0 || unlockedSkills?.includes(tree.skills[idx - 1]?.id)
                  const canUnlock = !isUnlocked && prevUnlocked && talentPoints >= skill.cost

                  return (
                    <motion.div
                      key={skill.id}
                      whileTap={canUnlock ? { scale: 0.98 } : {}}
                      onClick={() => canUnlock && unlockSkill(skill.id, skill.cost)}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{
                        background: isUnlocked
                          ? `${tree.color}10`
                          : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isUnlocked ? tree.color + '30' : 'rgba(255,255,255,0.06)'}`,
                        cursor: canUnlock ? 'pointer' : 'default',
                        opacity: (!isUnlocked && !prevUnlocked) ? 0.4 : 1,
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isUnlocked ? `${tree.color}22` : 'rgba(255,255,255,0.05)',
                        }}
                      >
                        {isUnlocked
                          ? <Check size={13} style={{ color: tree.color }} />
                          : !prevUnlocked
                          ? <Lock size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
                          : <ChevronRight size={13} style={{ color: 'var(--col-text-3)' }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black" style={{ color: isUnlocked ? tree.color : 'var(--col-text-1)' }}>
                          {skill.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>{skill.desc}</p>
                      </div>
                      {!isUnlocked && (
                        <div
                          className="px-2 py-1 rounded-lg flex items-center gap-1"
                          style={{
                            background: canUnlock ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${canUnlock ? 'rgba(245,200,66,0.25)' : 'rgba(255,255,255,0.06)'}`,
                          }}
                        >
                          <Zap size={9} style={{ color: canUnlock ? '#F5C842' : 'var(--col-text-3)' }} />
                          <span className="text-[10px] font-black nums" style={{ color: canUnlock ? '#F5C842' : 'var(--col-text-3)' }}>
                            {skill.cost}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
