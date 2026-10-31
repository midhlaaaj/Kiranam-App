import { describe, expect, it } from 'vitest'
import { dropDuplicateRupeeSigns } from './send-broadcast-message'

describe('dropDuplicateRupeeSigns', () => {
  const body = 'Hi {{1}}, your contribution of ₹{{2}} (due {{3}}) is pending.'

  it('drops the value sign where the body already has one', () => {
    expect(dropDuplicateRupeeSigns(body, ['Dev', '₹100', '5 Nov'])).toEqual(['Dev', '100', '5 Nov'])
  })

  it('keeps the sign when the body has none', () => {
    expect(dropDuplicateRupeeSigns('Amount: {{1}}', ['₹100'])).toEqual(['₹100'])
  })

  it('leaves values alone without a body', () => {
    expect(dropDuplicateRupeeSigns(undefined, ['₹100'])).toEqual(['₹100'])
    expect(dropDuplicateRupeeSigns('Pay ₹ {{ 1 }} now', ['₹250'])).toEqual(['250'])
  })
})
