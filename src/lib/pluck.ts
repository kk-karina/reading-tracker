// A tiny synth bass string. Runs only after a user gesture, so autoplay rules are happy.
let ctx: AudioContext | null = null

// Open strings E A D G, one octave up so laptop speakers can actually reproduce them.
export const STRINGS = [82.41, 110, 146.83, 196] as const

export function pluck(freq: number, opts: { slap?: boolean } = {}) {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') ctx.resume()
    const t = ctx.currentTime
    const out = ctx.createGain()
    out.gain.value = 0.9
    out.connect(ctx.destination)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = opts.slap ? 6 : 1.5
    filter.frequency.setValueAtTime(opts.slap ? 2400 : 900, t)
    filter.frequency.exponentialRampToValueAtTime(opts.slap ? 300 : 160, t + (opts.slap ? 0.25 : 0.6))
    filter.connect(out)

    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(0.5, t + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, t + (opts.slap ? 0.45 : 1.4))
    env.connect(filter)

    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const sub = ctx.createOscillator()
    sub.type = 'triangle'
    sub.frequency.value = freq / 2
    const subGain = ctx.createGain()
    subGain.gain.value = 0.6
    osc.connect(env)
    sub.connect(subGain).connect(env)
    osc.start(t)
    sub.start(t)
    osc.stop(t + 1.6)
    sub.stop(t + 1.6)
  } catch {
    /* no audio, no problem */
  }
}
