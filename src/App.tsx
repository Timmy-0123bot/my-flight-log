import { useEffect, useMemo, useState } from 'react'
import {
  distanceKm,
  EARTH_CIRCUMFERENCE_KM,
  findAirport,
  isDomestic,
  ROUTE_COLORS,
} from './airports'
import { FlightForm } from './components/FlightForm'
import { FlightList } from './components/FlightList'
import { GlobeView } from './components/GlobeView'
import { loadFlights, saveFlights } from './storage'
import type { Flight } from './types'

export default function App() {
  const [flights, setFlights] = useState<Flight[]>(loadFlights)
  const [panelOpen, setPanelOpen] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => saveFlights(flights), [flights])

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

  const summary = `${flights.length} フライト · ${Math.round(stats.totalKm).toLocaleString()} km`
  const laps = `地球 ${stats.laps.toFixed(2)} 周分`

  return (
    <div className={panelOpen ? 'layout panel-open' : 'layout'}>
      <GlobeView flights={flights} />

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
            flights={flights}
            onDelete={(id) => setFlights((prev) => prev.filter((f) => f.id !== id))}
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
