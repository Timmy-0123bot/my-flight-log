import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { MeshPhongMaterial } from 'three'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { FeatureCollection } from 'geojson'
import countries50m from 'world-atlas/countries-50m.json'
import { findAirport, isDomestic, ROUTE_COLORS } from '../airports'
import type { Airport, Flight } from '../types'

type Arc = { startLat: number; startLng: number; endLat: number; endLng: number; color: string }

// Natural Earth 1:50m の国境データ（日本の島々の形も判別できる精度）
const topology = countries50m as unknown as Topology
const countries = (feature(topology, topology.objects.countries) as FeatureCollection).features

// 海の色。陸地はポリゴンで上から描く
const oceanMaterial = new MeshPhongMaterial({ color: '#0b1a2e', shininess: 8 })

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
      arcs.push({
        startLat: from.lat,
        startLng: from.lng,
        endLat: to.lat,
        endLng: to.lng,
        color: isDomestic(from, to) ? ROUTE_COLORS.domestic : ROUTE_COLORS.international,
      })
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
        globeMaterial={oceanMaterial}
        backgroundImageUrl="/night-sky.png"
        atmosphereColor="#6b8cff"
        atmosphereAltitude={0.18}
        polygonsData={countries}
        polygonCapColor={() => '#34425a'}
        polygonSideColor={() => 'rgba(0,0,0,0)'}
        polygonStrokeColor={() => '#7a8aa6'}
        polygonAltitude={0.004}
        polygonsTransitionDuration={0}
        arcsData={arcs}
        arcColor="color"
        arcStroke={0.5}
        arcAltitudeAutoScale={0.4}
        pointsData={airports}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => '#ffffff'}
        pointAltitude={0.008}
        pointRadius={0.25}
        labelsData={airports}
        labelLat="lat"
        labelLng="lng"
        labelText="iata"
        labelSize={0.9}
        labelDotRadius={0}
        labelColor={() => 'rgba(255,255,255,0.85)'}
        labelAltitude={0.012}
      />
    </div>
  )
}
