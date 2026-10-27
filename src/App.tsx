import { useEffect, useMemo, useState } from 'react'
import { distanceKm, findAirport } from './airports'
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

  const totalKm = useMemo(
    () =>
      flights.reduce((sum, f) => {
        const from = findAirport(f.from)
        const to = findAirport(f.to)
        return from && to ? sum + distanceKm(from, to) : sum
      }, 0),
    [flights],
  )

  return (
    <div className={panelOpen ? 'layout panel-open' : 'layout'}>
      <GlobeView flights={flights} />

      {panelOpen ? (
        <aside className="panel">
          <header>
            <div>
              <h1>My Flight Log</h1>
              <p className="stats">
                {flights.length} フライト · {Math.round(totalKm).toLocaleString()} km
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
          ✈ {flights.length} フライト · {Math.round(totalKm).toLocaleString()} km
        </button>
      )}
    </div>
  )
}
