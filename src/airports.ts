import data from './data/airports.json'
import type { Airport } from './types'

const airports = data as Airport[]
const byIata = new Map(airports.map((a) => [a.iata, a]))

export function findAirport(iata: string): Airport | undefined {
  return byIata.get(iata.toUpperCase())
}

// 3レターコード完全一致 → コード前方一致 → 都市名/空港名の部分一致 の順で並べる
export function searchAirports(query: string, limit = 8): Airport[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const scored: { airport: Airport; score: number }[] = []
  for (const a of airports) {
    const code = a.iata.toLowerCase()
    const city = a.city.toLowerCase()
    const name = a.name.toLowerCase()
    let score = -1
    if (code === q) score = 0
    else if (code.startsWith(q)) score = 1
    else if (city.startsWith(q)) score = 2
    else if (name.startsWith(q)) score = 3
    else if (city.includes(q) || name.includes(q)) score = 4
    if (score >= 0) scored.push({ airport: a, score })
  }
  scored.sort((x, y) => x.score - y.score || x.airport.iata.localeCompare(y.airport.iata))
  return scored.slice(0, limit).map((s) => s.airport)
}

// 出発・到着が同じ国なら国内線
export function isDomestic(a: Airport, b: Airport): boolean {
  return a.country === b.country
}

export const ROUTE_COLORS = {
  domestic: '#ffc35c',
  international: '#ffffff',
} as const

// 地球の赤道周長（km）
export const EARTH_CIRCUMFERENCE_KM = 40075

// 2空港を結ぶ大圏航路の中間地点
export function midpoint(a: Airport, b: Airport): { lat: number; lng: number } {
  const rad = Math.PI / 180
  const lat1 = a.lat * rad
  const lat2 = b.lat * rad
  const dLng = (b.lng - a.lng) * rad
  const bx = Math.cos(lat2) * Math.cos(dLng)
  const by = Math.cos(lat2) * Math.sin(dLng)
  const lat = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.hypot(Math.cos(lat1) + bx, by))
  const lng = a.lng * rad + Math.atan2(by, Math.cos(lat1) + bx)
  return { lat: lat / rad, lng: ((lng / rad + 540) % 360) - 180 }
}

// 大圏距離（km）
export function distanceKm(a: Airport, b: Airport): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
