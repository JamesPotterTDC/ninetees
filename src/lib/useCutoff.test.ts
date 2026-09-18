import { describe, expect, it } from 'vitest'
import { despatchMessage } from './useCutoff'

// January dates: the UK is on GMT, so the UTC hour is the UK hour.
describe('despatchMessage', () => {
  it('counts down to 2pm on a working day', () => {
    expect(despatchMessage(new Date('2026-01-14T10:30:00Z'))).toBe('Order in the next 3h 30m and it leaves our warehouse today.')
  })
  it('drops the hours when under an hour remains', () => {
    expect(despatchMessage(new Date('2026-01-14T13:40:00Z'))).toBe('Order in the next 20m and it leaves our warehouse today.')
  })
  it('names the next day after the cut-off', () => {
    expect(despatchMessage(new Date('2026-01-13T14:00:00Z'))).toBe('Order now and it leaves our warehouse on Wednesday.')
  })
  it('rolls Friday afternoon and the weekend to Monday', () => {
    expect(despatchMessage(new Date('2026-01-16T15:00:00Z'))).toContain('on Monday')
    expect(despatchMessage(new Date('2026-01-17T09:00:00Z'))).toContain('on Monday')
    expect(despatchMessage(new Date('2026-01-18T09:00:00Z'))).toContain('on Monday')
  })
  it('respects British Summer Time', () => {
    // 12:30 UTC in July is 13:30 in London, so 30 minutes remain.
    expect(despatchMessage(new Date('2026-07-15T12:30:00Z'))).toBe('Order in the next 30m and it leaves our warehouse today.')
  })
})
