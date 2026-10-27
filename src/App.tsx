import { useEffect, useMemo, useState } from 'react'
import { distanceKm, findAirport } from './airports'
import { FlightForm } from './components/FlightForm'
import { FlightList } from './components/FlightList'
import { GlobeView } from './components/GlobeView'
import { loadFlights, saveFlights } from './storage'
import type { Flight } from './types'

export default function App() {
  const [flights, setFlights] = useState<Flight[]>(loadFlights)

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
    <>
      <GlobeView flights={flights} />
      <aside className="panel">
        <header>
          <h1>My Flight Log</h1>
          <p className="stats">
            {flights.length} フライト · {Math.round(totalKm).toLocaleString()} km
          </p>
        </header>
        <FlightForm onAdd={(f) => setFlights((prev) => [...prev, f])} />
        <FlightList
          flights={flights}
          onDelete={(id) => setFlights((prev) => prev.filter((f) => f.id !== id))}
        />
      </aside>
    </>
  )
}
