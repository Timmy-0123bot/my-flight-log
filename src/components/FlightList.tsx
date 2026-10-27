import { distanceKm, findAirport } from '../airports'
import type { Flight } from '../types'

type Props = {
  flights: Flight[]
  onDelete: (id: string) => void
}

export function FlightList({ flights, onDelete }: Props) {
  if (flights.length === 0) {
    return <p className="empty">まだフライトがありません</p>
  }

  // 日付ありは新しい順、日付なしは末尾
  const sorted = [...flights].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <ul className="flight-list">
      {sorted.map((f) => {
        const from = findAirport(f.from)
        const to = findAirport(f.to)
        const km = from && to ? Math.round(distanceKm(from, to)) : null
        return (
          <li key={f.id}>
            <div className="route">
              <strong>{f.from}</strong>
              <span className="arrow">→</span>
              <strong>{f.to}</strong>
            </div>
            <div className="meta">
              {[f.date, f.flightNumber, f.airline, km !== null && `${km.toLocaleString()} km`]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <button
              type="button"
              className="link danger"
              onClick={() => {
                if (confirm(`${f.from} → ${f.to} を削除しますか？`)) onDelete(f.id)
              }}
            >
              削除
            </button>
          </li>
        )
      })}
    </ul>
  )
}
