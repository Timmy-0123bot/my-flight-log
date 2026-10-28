import { useState } from 'react'
import { distanceKm, findAirport, isDomestic, ROUTE_COLORS } from '../airports'
import type { Flight } from '../types'
import { FlightForm } from './FlightForm'

type Props = {
  flights: Flight[]
  emptyMessage: string
  focusedId: string | null
  onFocus: (id: string) => void
  // 省略すると「編集」「削除」を出さない（閲覧のみ）
  onUpdate?: (flight: Flight) => void
  onDelete?: (id: string) => void
}

// 折りたたみ時に表示する件数
const COLLAPSED_COUNT = 5

export function FlightList({ flights, emptyMessage, focusedId, onFocus, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  if (flights.length === 0) {
    return <p className="empty">{emptyMessage}</p>
  }

  // 日付なしを先頭に（日付を入れずに追加した便が、折りたたみ時に隠れないように）、
  // その後に日付ありを新しい順で並べる。日付が同じ・日付なし同士は、後から登録したものを上にする
  const sorted = flights
    .map((flight, index) => ({ flight, index }))
    .sort(
      (a, b) =>
        Number(!b.flight.date) - Number(!a.flight.date) ||
        (b.flight.date ?? '').localeCompare(a.flight.date ?? '') ||
        b.index - a.index,
    )
    .map(({ flight }) => flight)
  const hiddenCount = sorted.length - COLLAPSED_COUNT
  const shown = showAll ? sorted : sorted.slice(0, COLLAPSED_COUNT)

  return (
    <>
      <ul className="flight-list">
        {shown.map((f) => {
          if (f.id === editingId && onUpdate) {
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
              {(onUpdate || onDelete) && (
                <div className="item-actions">
                  {onUpdate && (
                    <button type="button" className="link" onClick={() => setEditingId(f.id)}>
                      編集
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="link danger"
                      onClick={() => {
                        if (confirm(`${f.from} → ${f.to} を削除しますか？`)) onDelete(f.id)
                      }}
                    >
                      削除
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {hiddenCount > 0 && (
        <button type="button" className="secondary small" onClick={() => setShowAll((v) => !v)}>
          {showAll ? '折りたたむ' : `すべて表示（他 ${hiddenCount} 件）`}
        </button>
      )}
    </>
  )
}
