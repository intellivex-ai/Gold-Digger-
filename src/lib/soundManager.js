/**
 * soundManager.js
 * 
 * This file handles all the sound effects in the game.
 * Instead of loading MP3 files (which make the app slower), it creates
 * sounds "procedurally" using the browser's built-in Web Audio API.
 * Think of it like a built-in digital synthesizer!
 */

let audioContext = null

/**
 * Gets or creates the AudioContext.
 * We only want one AudioContext for the whole app. Also, browsers block
 * sound until the user interacts with the page, so we resume it if it was paused.
 */
function getAudioContext() {
  if (!audioContext) {
    // Create the audio context (with a fallback for older Safari browsers)
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  
  // If the browser paused the audio (e.g. before the user clicked anywhere), wake it up
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  
  return audioContext
}

/**
 * Plays a single synthesized tone.
 * 
 * @param {object} options - Settings for the sound
 * @param {number} options.frequency - The pitch of the sound (higher = squeakier)
 * @param {string} options.type - The shape of the sound wave (sine, square, sawtooth, triangle)
 * @param {number} options.duration - How long the sound lasts
 * @param {number} options.gain - How loud the sound is (volume)
 * @param {number} options.attack - How fast the sound fades in
 * @param {number} options.decay - How fast it drops from max volume to the sustain volume
 * @param {number} options.sustain - The holding volume level
 * @param {number} options.release - How fast it fades out after the duration
 * @param {number} options.detune - Fine-tuning the pitch
 * @param {number} options.delay - How long to wait before playing
 */
function playTone({ frequency = 440, type = 'sine', duration = 0.15, gain = 0.18, attack = 0.005, decay = 0.05, sustain = 0.5, release = 0.1, detune = 0, delay = 0 } = {}) {
  try {
    const ctx = getAudioContext()
    const startTime = ctx.currentTime + delay

    // The oscillator creates the actual sound wave
    const oscillator = ctx.createOscillator()
    
    // The gain node controls the volume envelope (fading in and out)
    const gainNode = ctx.createGain()

    // Configure the pitch and wave type
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, startTime)
    oscillator.detune.setValueAtTime(detune, startTime)

    // Configure the volume over time (Attack, Decay, Sustain, Release curve)
    gainNode.gain.setValueAtTime(0, startTime) // Start silent
    gainNode.gain.linearRampToValueAtTime(gain, startTime + attack) // Fade in
    gainNode.gain.linearRampToValueAtTime(gain * sustain, startTime + attack + decay) // Drop to holding volume
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration + release) // Fade out completely

    // Connect the pieces: Oscillator -> Gain (Volume) -> Speakers
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Play the sound and schedule it to stop
    oscillator.start(startTime)
    oscillator.stop(startTime + duration + release + 0.05)
  } catch {
    // If the browser doesn't support audio or something breaks, we just stay quiet
    // We don't want the game to crash just because a sound failed.
  }
}

/**
 * Our library of game sounds.
 * These functions just call playTone with different settings to make
 * specific sound effects (like a chime for collecting money).
 */
export const sounds = {
  /** A rising chime (four notes) when you collect money */
  collect() {
    const notes = [523, 659, 784, 1047] // C, E, G, C (one octave up)
    notes.forEach((freq, i) => {
      playTone({ frequency: freq, type: 'triangle', gain: 0.2, duration: 0.12, attack: 0.003, decay: 0.04, release: 0.15, delay: i * 0.07 })
    })
  },

  /** A quick, happy two-note sound when buying a stock */
  buy() {
    playTone({ frequency: 440, type: 'sine', gain: 0.15, duration: 0.08 })
    playTone({ frequency: 660, type: 'sine', gain: 0.15, duration: 0.1, delay: 0.09 })
  },

  /** A quick, descending two-note sound when selling a stock */
  sell() {
    playTone({ frequency: 660, type: 'sine', gain: 0.15, duration: 0.08 })
    playTone({ frequency: 440, type: 'sine', gain: 0.15, duration: 0.1, delay: 0.09 })
  },

  /** A very short, high-pitched click when sending a message */
  send() {
    playTone({ frequency: 1200, type: 'sine', gain: 0.08, duration: 0.06, attack: 0.002, decay: 0.02, release: 0.05 })
  },

  /** A soft "pop" when receiving a message */
  receive() {
    playTone({ frequency: 880, type: 'sine', gain: 0.07, duration: 0.07, attack: 0.002, release: 0.08 })
  },

  /** A low, buzzy sound when something goes wrong (error) */
  error() {
    // Sawtooth waves sound harsh and buzzy, perfect for errors
    playTone({ frequency: 220, type: 'sawtooth', gain: 0.1, duration: 0.2, attack: 0.01, release: 0.15 })
  },

  /** A happy three-note chord when an action succeeds */
  success() {
    const notes = [523, 659, 784]
    notes.forEach((freq, i) => {
      playTone({ frequency: freq, type: 'sine', gain: 0.16, duration: 0.18, attack: 0.004, release: 0.2, delay: i * 0.1 })
    })
  },

  /** A tiny click sound for tapping tabs or buttons */
  tap() {
    playTone({ frequency: 900, type: 'sine', gain: 0.06, duration: 0.04, attack: 0.001, release: 0.04 })
  },

  /** A barely noticeable click when the stock price ticks up/down */
  tick() {
    playTone({ frequency: 1400, type: 'sine', gain: 0.025, duration: 0.025, attack: 0.001, release: 0.02 })
  },

  /** A dramatic 5-note fanfare when leveling up or upgrading */
  levelUp() {
    const notes = [523, 659, 784, 1047, 1318]
    notes.forEach((freq, i) => {
      playTone({ frequency: freq, type: 'triangle', gain: 0.22, duration: 0.15, attack: 0.004, release: 0.2, delay: i * 0.08 })
    })
  },
}

export default sounds
