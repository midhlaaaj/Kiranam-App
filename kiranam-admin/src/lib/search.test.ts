import { describe, expect, it } from 'vitest'
import { isKkSearch, personSearchFilter } from './search'

describe('isKkSearch', () => {
  it('recognises KK and KKG numbers, case-insensitively', () => {
    for (const t of ['kk', 'KK12', 'kkg', 'KKG 7', 'kkg405']) expect(isKkSearch(t)).toBe(true)
  })
  it('ignores names and phone numbers', () => {
    for (const t of ['kkr', 'Kkalam', '9846', 'kk12a', 'dev']) expect(isKkSearch(t)).toBe(false)
  })
})

describe('personSearchFilter', () => {
  it('searches only the KK number for a KK-looking term', () => {
    expect(personSearchFilter('kkg 45')).toBe('kk_number.ilike.*kkg45*')
  })
  it('searches name, phone and KK number otherwise', () => {
    expect(personSearchFilter('dev')).toBe('full_name.ilike.*dev*,phone.ilike.*dev*,kk_number.ilike.*dev*')
    expect(personSearchFilter('98 46')).toContain('phone.ilike.*9846*')
  })
})
