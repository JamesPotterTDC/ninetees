import { useEffect, useState } from 'react'
import { config } from '../config'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ukNow(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { day: SHORT.indexOf(get('weekday')), h: Number(get('hour')), m: Number(get('minute')) }
}

/** Despatch promise for the product page: a countdown to the same-day cut-off on working days, otherwise the next despatch day. */
export function despatchMessage(now: Date = new Date()): string {
  const { day, h, m } = ukNow(now)
  const cutoff = config.delivery.cutoffHour
  if (day >= 1 && day <= 5 && h < cutoff) {
    const mins = cutoff * 60 - (h * 60 + m)
    const hh = Math.floor(mins / 60), mm = mins % 60
    return `Order in the next ${hh ? `${hh}h ` : ''}${mm}m and it leaves our warehouse today.`
  }
  const next = day >= 5 || day === 0 ? 'Monday' : DAYS[day + 1]
  return `Order now and it leaves our warehouse on ${next}.`
}

export function useCutoff(): string {
  const [msg, setMsg] = useState(() => despatchMessage())
  useEffect(() => {
    const t = setInterval(() => setMsg(despatchMessage()), 30_000)
    return () => clearInterval(t)
  }, [])
  return msg
}
