import { useMemo, useState } from 'react'
import {
  distanceKm,
  EARTH_CIRCUMFERENCE_KM,
  findAirport,
  isDomestic,
  ROUTE_COLORS,
} from './airports'
import { AccountControls } from './components/AccountControls'
import { BackupControls } from './components/BackupControls'
import { FlightForm } from './components/FlightForm'
import { FlightList } from './components/FlightList'
import { GlobeView } from './components/GlobeView'
import { useFlights } from './useFlights'

type RouteFilter = 'all' | 'domestic' | 'international'

const FILTERS: { value: RouteFilter; label: string }[] = [
  { value: 'all', label: '全て' },
  { value: 'domestic', label: '国内線' },
  { value: 'international', label: '国際線' },
]

// パネルに並べる「よく使う空港」の数
const TOP_AIRPORT_COUNT = 6

export default function App() {
  const { flights, updateFlights: setFlights, user, status, signIn, signOut } = useFlights()
  const [panelOpen, setPanelOpen] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null)
  const [focusedFlightId, setFocusedFlightId] = useState<string | null>(null)


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

  // 利用回数の多い空港（パネルから地図を探さずに選べるようにする）
  const topAirports = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of flights) {
      counts.set(f.from, (counts.get(f.from) ?? 0) + 1)
      counts.set(f.to, (counts.get(f.to) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_AIRPORT_COUNT)
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
        focusedFlightId={focusedFlightId}
        // 選択中の空港をもう一度押したら解除する
        onSelectAirport={(iata) => setSelectedAirport((prev) => (iata !== prev ? iata : null))}
        onBackgroundClick={() => {
          setSelectedAirport(null)
          setFocusedFlightId(null)
        }}
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

          {topAirports.length > 0 && (
            <div className="top-airports" role="group" aria-label="よく使う空港">
              {topAirports.map(([iata, count]) => (
                <button
                  key={iata}
                  type="button"
                  className={iata === selectedAirport ? 'chip active' : 'chip'}
                  aria-pressed={iata === selectedAirport}
                  title={findAirport(iata)?.name}
                  onClick={() => setSelectedAirport((prev) => (iata !== prev ? iata : null))}
                >
                  {iata}
                  <small>{count}</small>
                </button>
              ))}
            </div>
          )}

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
              onSubmit={(f) => setFlights((prev) => [...prev, f])}
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
            focusedId={focusedFlightId}
            // 強調中のフライトをもう一度押したら解除する
            onFocus={(id) => setFocusedFlightId((prev) => (id !== prev ? id : null))}
            onUpdate={(updated) =>
              setFlights((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
            }
            onDelete={(id) => setFlights((prev) => prev.filter((f) => f.id !== id))}
          />

          <div className="panel-footer">
            <AccountControls user={user} status={status} onSignIn={signIn} onSignOut={signOut} />
            <BackupControls
              flights={flights}
              onImport={(imported) => {
                setFlights(() => imported)
                setFocusedFlightId(null)
                setSelectedAirport(null)
              }}
            />
          </div>
        </aside>
      ) : (
        <button type="button" className="panel-toggle" onClick={() => setPanelOpen(true)}>
          ✈ {summary} · {laps}
        </button>
      )}
    </div>
  )
}
