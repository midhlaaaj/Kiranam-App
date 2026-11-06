import { describe, expect, it } from 'vitest'
import { currentKkHighWater, KK_NUMBER_RE } from './kk'

describe('currentKkHighWater', () => {
  it('continues from the highest number in an ordinary run', () => {
    expect(currentKkHighWater([1, 2, 3, 2034, 2035, 2033])).toBe(2035)
  })
  it('skips a phone number saved as a KK number', () => {
    expect(currentKkHighWater([2033, 2034, 2035, 9895681057])).toBe(2035)
  })
  it('skips stray typos far above the run', () => {
    expect(currentKkHighWater([2034, 2035, 9899, 9895681057])).toBe(2035)
    expect(currentKkHighWater([171, 172, 267, 1626, 1717, 1719, 81541])).toBe(1719)
  })
  it('handles a lone number and an empty series', () => {
    expect(currentKkHighWater([7])).toBe(7)
    expect(currentKkHighWater([])).toBe(0)
  })
})

describe('KK_NUMBER_RE', () => {
  it('accepts KK and KKG numbers only', () => {
    for (const v of ['KK1', 'kkg45', 'KKG1719']) expect(KK_NUMBER_RE.test(v)).toBe(true)
    for (const v of ['KK', 'KKX5', '12', 'KK 5']) expect(KK_NUMBER_RE.test(v)).toBe(false)
  })
})
