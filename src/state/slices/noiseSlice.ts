import type { NoiseState } from '../../types'

export function defaultNoiseState(): NoiseState {
  return {
    positionJitter: 0,
    scaleRandomness: 0,
    seed: 1,
  }
}
