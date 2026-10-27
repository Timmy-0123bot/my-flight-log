import { distanceKm, findAirport, isDomestic, ROUTE_COLORS } from '../airports'
import type { Flight } from '../types'

type Props = {
  flights: Flight[]
  emptyMessage: string
  onDelete: (id: string) => void
}

export function FlightList({ flights, emptyMessage, onDelete }: Props) {
  if (flights.length === 0) {
    return <p className="empty">{emptyMessage}</p>
  }

  // 日付ありは新しい順、日付なしは末尾
  const sorted = [...flights].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <ul className="flight-list">
      {sorted.map((f) => {
        const from = findAirport(f.from)
        const to = findAirport(f.to)
        const km = from && to ? Math.round(distanceKm(from, to)) : null
        const domestic = from && to ? isDomestic(from, to) : false
        return (
          <li key={f.id}>
            <div className="route">
              <i
                className="route-dot"
                title={domestic ? '国内線' : '国際線'}
                style={{ background: domestic ? ROUTE_COLORS.domestic : ROUTE_COLORS.international }}
              />
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
