import { useEffect, useMemo, useState } from 'react'
import {
  distanceKm,
  EARTH_CIRCUMFERENCE_KM,
  findAirport,
  isDomestic,
  ROUTE_COLORS,
} from './airports'
import { BackupControls } from './components/BackupControls'
import { FlightForm } from './components/FlightForm'
import { FlightList } from './components/FlightList'
import { GlobeView } from './components/GlobeView'
import { loadFlights, saveFlights } from './storage'
import type { Flight } from './types'

type RouteFilter = 'all' | 'domestic' | 'international'

const FILTERS: { value: RouteFilter; label: string }[] = [
  { value: 'all', label: '全て' },
  { value: 'domestic', label: '国内線' },
  { value: 'international', label: '国際線' },
]

export default function App() {
  const [flights, setFlights] = useState<Flight[]>(loadFlights)
  const [panelOpen, setPanelOpen] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null)

  useEffect(() => saveFlights(flights), [flights])

  // 集計は絞り込みに関係なく全フライトで出す
  const stats = useMemo(() => {
    let totalKm = 0
    let domestic = 0
    let international = 0
    for (const f of flights) {
      const from = findAirport(f.from)
      const to = findAirport(f.to)
      if (!from || !to) continue
      totalKm += distanceKm(from, to)
      if (isDomestic(from, to)) domestic++
      else international++
    }
    return { totalKm, domestic, international, laps: totalKm / EARTH_CIRCUMFERENCE_KM }
  }, [flights])

  // 地図と一覧に出すフライト（国内線/国際線の切り替えと、選択中の空港で絞り込む）
  const visibleFlights = useMemo(
    () =>
      flights.filter((f) => {
        if (selectedAirport && f.from !== selectedAirport && f.to !== selectedAirport) return false
        if (routeFilter === 'all') return true
        const from = findAirport(f.from)
        const to = findAirport(f.to)
        if (!from || !to) return false
        return isDomestic(from, to) === (routeFilter === 'domestic')
      }),
    [flights, routeFilter, selectedAirport],
  )

  const summary = `${flights.length} フライト · ${Math.round(stats.totalKm).toLocaleString()} km`
  const laps = `地球 ${stats.laps.toFixed(2)} 周分`
  const isFiltered = routeFilter !== 'all' || selectedAirport !== null

  return (
    <div className={panelOpen ? 'layout panel-open' : 'layout'}>
      <GlobeView
        flights={visibleFlights}
        selectedAirport={selectedAirport}
        // 選択中の空港をもう一度押したら解除する
        onSelectAirport={(iata) =>
          setSelectedAirport((prev) => (iata && iata !== prev ? iata : null))
        }
      />

      {panelOpen ? (
        <aside className="panel">
          <header>
            <div>
              <h1>My Flight Log</h1>
              <p className="stats">{summary}</p>
              <p className="laps">{laps}</p>
              <p className="legend">
                <span>
                  <i style={{ background: ROUTE_COLORS.domestic }} />
                  国内線 {stats.domestic}
                </span>
                <span>
                  <i style={{ background: ROUTE_COLORS.international }} />
                  国際線 {stats.international}
                </span>
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="パネルを閉じる"
              onClick={() => setPanelOpen(false)}
            >
              ×
            </button>
          </header>

          <div className="segmented" role="group" aria-label="路線の種類">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={routeFilter === f.value ? 'active' : ''}
                aria-pressed={routeFilter === f.value}
                onClick={() => setRouteFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {selectedAirport && (
            <div className="selection">
              <span>
                <strong>{selectedAirport}</strong> の路線
                <small>{findAirport(selectedAirport)?.city}</small>
              </span>
              <button type="button" className="link" onClick={() => setSelectedAirport(null)}>
                解除
              </button>
            </div>
          )}

          {formOpen ? (
            <FlightForm
              onAdd={(f) => setFlights((prev) => [...prev, f])}
              onClose={() => setFormOpen(false)}
            />
          ) : (
            <button type="button" className="primary" onClick={() => setFormOpen(true)}>
              ＋ フライトを追加
            </button>
          )}

          <FlightList
            flights={visibleFlights}
            emptyMessage={isFiltered ? '該当するフライトがありません' : 'まだフライトがありません'}
            onDelete={(id) => setFlights((prev) => prev.filter((f) => f.id !== id))}
          />

          <BackupControls
            flights={flights}
            onImport={(imported) => {
              setFlights(imported)
              setSelectedAirport(null)
            }}
          />
        </aside>
      ) : (
        <button type="button" className="panel-toggle" onClick={() => setPanelOpen(true)}>
          ✈ {summary} · {laps}
        </button>
      )}
    </div>
  )
}
