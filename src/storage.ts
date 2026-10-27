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

// バックアップファイルの形式
type Backup = {
  app: 'my-flight-log'
  version: 1
  exportedAt: string
  flights: Flight[]
}

// 全フライトをJSONファイルとしてダウンロードさせる
export function exportFlights(flights: Flight[]): void {
  const backup: Backup = {
    app: 'my-flight-log',
    version: 1,
    exportedAt: new Date().toISOString(),
    flights,
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `my-flight-log-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  // 直後に破棄するとダウンロードが始まらないブラウザがあるため、少し待ってから解放する
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const IATA = /^[A-Z]{3}$/
// YYYY / YYYY-MM / YYYY-MM-DD
const DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

// バックアップファイルの中身を検証してフライト一覧に変換する。不正な形式なら例外を投げる
export function parseBackup(text: string): Flight[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('JSONとして読み込めませんでした')
  }
  const list = (data as Partial<Backup> | null)?.flights
  if (!Array.isArray(list)) throw new Error('my-flight-log のバックアップファイルではありません')

  return list.map((item, i) => {
    const f = item as Record<string, unknown>
    const from = typeof f.from === 'string' ? f.from.toUpperCase() : ''
    const to = typeof f.to === 'string' ? f.to.toUpperCase() : ''
    if (!IATA.test(from) || !IATA.test(to)) {
      throw new Error(`${i + 1} 件目の空港コードが正しくありません`)
    }
    const date = optionalString(f.date)
    if (date && !DATE.test(date)) {
      throw new Error(`${i + 1} 件目の日付が正しくありません（${date}）`)
    }
    return {
      id: optionalString(f.id) ?? crypto.randomUUID(),
      from,
      to,
      date,
      flightNumber: optionalString(f.flightNumber),
      airline: optionalString(f.airline),
    }
  })
}
