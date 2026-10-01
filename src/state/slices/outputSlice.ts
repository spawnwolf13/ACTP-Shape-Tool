import type { OutputState } from '../../types'

export function defaultOutputState(): OutputState {
  return {
    preset: '1:1',
    customWidth: 1024,
    customHeight: 1024,
  }
}
