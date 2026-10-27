import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { findAirport } from '../airports'
import type { Airport, Flight } from '../types'

type Arc = { startLat: number; startLng: number; endLat: number; endLng: number }

type Props = {
  flights: Flight[]
}

export function GlobeView({ flights }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  // 表示領域はCSSで決め、その大きさに地球儀を合わせる
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 初期視点は東京付近
  useEffect(() => {
    globeRef.current?.pointOfView({ lat: 30, lng: 140, altitude: 2.2 }, 0)
  }, [])

  const { arcs, airports } = useMemo(() => {
    const arcs: Arc[] = []
    const used = new Map<string, Airport>()
    for (const f of flights) {
      const from = findAirport(f.from)
      const to = findAirport(f.to)
      if (!from || !to) continue
      arcs.push({ startLat: from.lat, startLng: from.lng, endLat: to.lat, endLng: to.lng })
      used.set(from.iata, from)
      used.set(to.iata, to)
    }
    return { arcs, airports: [...used.values()] }
  }, [flights])

  return (
    <div ref={containerRef} className="globe-area">
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeImageUrl="/earth-dark.jpg"
        backgroundImageUrl="/night-sky.png"
        atmosphereColor="#6b8cff"
        atmosphereAltitude={0.18}
        arcsData={arcs}
        arcColor={() => 'rgba(255,255,255,0.9)'}
        arcStroke={0.5}
        arcAltitudeAutoScale={0.4}
        pointsData={airports}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => '#ffffff'}
        pointAltitude={0.005}
        pointRadius={0.25}
        labelsData={airports}
        labelLat="lat"
        labelLng="lng"
        labelText="iata"
        labelSize={0.9}
        labelDotRadius={0}
        labelColor={() => 'rgba(255,255,255,0.85)'}
        labelAltitude={0.01}
      />
    </div>
  )
}
