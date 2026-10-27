import type { Flight } from './types'

const KEY = 'my-flight-log:flights'

export function loadFlights(): Flight[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Flight[]) : []
  } catch {
    return []
  }
}

export function saveFlights(flights: Flight[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(flights))
  } catch {
    // 保存できない環境（プライベートモード等）では何もしない
  }
}
