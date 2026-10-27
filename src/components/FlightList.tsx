import { useState } from 'react'
import { distanceKm, findAirport, isDomestic, ROUTE_COLORS } from '../airports'
import type { Flight } from '../types'
import { FlightForm } from './FlightForm'

type Props = {
  flights: Flight[]
  emptyMessage: string
  focusedId: string | null
  onFocus: (id: string) => void
  onUpdate: (flight: Flight) => void
  onDelete: (id: string) => void
}

export function FlightList({ flights, emptyMessage, focusedId, onFocus, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (flights.length === 0) {
    return <p className="empty">{emptyMessage}</p>
  }

  // 日付ありは新しい順、日付なしは末尾
  const sorted = [...flights].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <ul className="flight-list">
      {sorted.map((f) => {
        if (f.id === editingId) {
          return (
            <li key={f.id} className="editing">
              <FlightForm
                initial={f}
                onSubmit={(updated) => {
                  onUpdate(updated)
                  setEditingId(null)
                }}
                onClose={() => setEditingId(null)}
              />
            </li>
          )
        }

        const from = findAirport(f.from)
        const to = findAirport(f.to)
        const km = from && to ? Math.round(distanceKm(from, to)) : null
        const domestic = from && to ? isDomestic(from, to) : false
        return (
          <li key={f.id} className={f.id === focusedId ? 'focused' : ''}>
            {/* 押すと地図がこの路線へ移動する */}
            <button type="button" className="flight-summary" onClick={() => onFocus(f.id)}>
              <span className="route">
                <i
                  className="route-dot"
                  title={domestic ? '国内線' : '国際線'}
                  style={{ background: domestic ? ROUTE_COLORS.domestic : ROUTE_COLORS.international }}
                />
                <strong>{f.from}</strong>
                <span className="arrow">→</span>
                <strong>{f.to}</strong>
              </span>
              <span className="meta">
                {[f.date, f.flightNumber, f.airline, km !== null && `${km.toLocaleString()} km`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
            <div className="item-actions">
              <button type="button" className="link" onClick={() => setEditingId(f.id)}>
                編集
              </button>
              <button
                type="button"
                className="link danger"
                onClick={() => {
                  if (confirm(`${f.from} → ${f.to} を削除しますか？`)) onDelete(f.id)
                }}
              >
                削除
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
