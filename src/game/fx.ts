/**
 * Tiny pub/sub used to fire visual effects from anywhere (action handlers,
 * screens) into whichever renderer is mounted. Keeps the game logic free of
 * React refs and canvas details.
 */

export type ParticleKind =
  | 'spark' // blue spirit sparks (tap / blade flash)
  | 'ember' // orange embers (fire, training)
  | 'dust' // grey motes (idle room, footsteps)
  | 'suds' // teal bubbles (washing)
  | 'crumb' // brown bits (eating)
  | 'zzz' // sleep marks
  | 'straw' // yellow straw (hitting the dummy)
  | 'coin' // gold flecks (reward)

export type FloatTone = 'good' | 'bad' | 'coin' | 'shard' | 'plain'

export type FxEvent =
  | {
      type: 'burst'
      kind: ParticleKind
      /** logical scene coords; omitted = at the character's chest */
      x?: number
      y?: number
      count?: number
      power?: number
    }
  | {
      type: 'float'
      text: string
      tone?: FloatTone
      /** 0..1 of the scene box; omitted = above the character */
      nx?: number
      ny?: number
    }
  | { type: 'shake'; power?: number }

type Handler = (e: FxEvent) => void

const handlers = new Set<Handler>()

export function onFx(handler: Handler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function emitFx(event: FxEvent): void {
  for (const h of handlers) h(event)
}

export function burst(
  kind: ParticleKind,
  opts: { x?: number; y?: number; count?: number; power?: number } = {},
): void {
  emitFx({ type: 'burst', kind, ...opts })
}

export function floatText(text: string, tone: FloatTone = 'plain'): void {
  emitFx({ type: 'float', text, tone })
}
