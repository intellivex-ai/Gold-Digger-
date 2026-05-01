/**
 * soundManager – lightweight Web Audio API sound engine.
 * No external dependencies, no audio files required.
 * All sounds are synthesized procedurally.
 */

let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playTone({ frequency = 440, type = 'sine', duration = 0.15, gain = 0.18, attack = 0.005, decay = 0.05, sustain = 0.5, release = 0.1, detune = 0, delay = 0 } = {}) {
  try {
    const c = getCtx()
    const t = c.currentTime + delay

    const osc = c.createOscillator()
    const gainNode = c.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, t)
    osc.detune.setValueAtTime(detune, t)

    gainNode.gain.setValueAtTime(0, t)
    gainNode.gain.linearRampToValueAtTime(gain, t + attack)
    gainNode.gain.linearRampToValueAtTime(gain * sustain, t + attack + decay)
    gainNode.gain.linearRampToValueAtTime(0, t + duration + release)

    osc.connect(gainNode)
    gainNode.connect(c.destination)

    osc.start(t)
    osc.stop(t + duration + release + 0.05)
  } catch {
    // Audio not supported
  }
}

export const sounds = {
  /** Collect offline earnings – rising coin chime */
  collect() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      playTone({ frequency: freq, type: 'triangle', gain: 0.2, duration: 0.12, attack: 0.003, decay: 0.04, release: 0.15, delay: i * 0.07 })
    })
  },

  /** Buy stock – positive ascending blip */
  buy() {
    playTone({ frequency: 440, type: 'sine', gain: 0.15, duration: 0.08 })
    playTone({ frequency: 660, type: 'sine', gain: 0.15, duration: 0.1, delay: 0.09 })
  },

  /** Sell stock – descending blip */
  sell() {
    playTone({ frequency: 660, type: 'sine', gain: 0.15, duration: 0.08 })
    playTone({ frequency: 440, type: 'sine', gain: 0.15, duration: 0.1, delay: 0.09 })
  },

  /** Send chat message – subtle soft click */
  send() {
    playTone({ frequency: 1200, type: 'sine', gain: 0.08, duration: 0.06, attack: 0.002, decay: 0.02, release: 0.05 })
  },

  /** Receive message – gentle pop */
  receive() {
    playTone({ frequency: 880, type: 'sine', gain: 0.07, duration: 0.07, attack: 0.002, release: 0.08 })
  },

  /** Error feedback – low soft buzz */
  error() {
    playTone({ frequency: 220, type: 'sawtooth', gain: 0.1, duration: 0.2, attack: 0.01, release: 0.15 })
  },

  /** Success – rising three-note chime */
  success() {
    const notes = [523, 659, 784]
    notes.forEach((freq, i) => {
      playTone({ frequency: freq, type: 'sine', gain: 0.16, duration: 0.18, attack: 0.004, release: 0.2, delay: i * 0.1 })
    })
  },

  /** Tab switch – micro click */
  tap() {
    playTone({ frequency: 900, type: 'sine', gain: 0.06, duration: 0.04, attack: 0.001, release: 0.04 })
  },

  /** Stock price tick (very subtle) */
  tick() {
    playTone({ frequency: 1400, type: 'sine', gain: 0.025, duration: 0.025, attack: 0.001, release: 0.02 })
  },

  /** Upgrade / level-up fanfare */
  levelUp() {
    const notes = [523, 659, 784, 1047, 1318]
    notes.forEach((freq, i) => {
      playTone({ frequency: freq, type: 'triangle', gain: 0.22, duration: 0.15, attack: 0.004, release: 0.2, delay: i * 0.08 })
    })
  },
}

export default sounds
