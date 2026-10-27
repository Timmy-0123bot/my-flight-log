import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

type AirportLabel = Airport & { count: number; el: HTMLElement }

// ラベル（3レターコード）1つぶんの画面上の大きさ（px）。重なり判定に使う
const LABEL_WIDTH = 30
const LABEL_HEIGHT = 16

// 画面上で常に同じ大きさになるHTMLラベル。外側の要素が空港の位置に置かれ、文字は点の右上に出す
function createLabelElement(text: string, selected: boolean, onClick: () => void): HTMLElement {
  const el = document.createElement('div')
  el.className = selected ? 'airport-label selected' : 'airport-label'
  const span = document.createElement('span')
  span.textContent = text
  // 地球儀の回転操作がポインターを奪うとクリックが届かないため、押下を親へ伝えない
  span.addEventListener('pointerdown', (e) => e.stopPropagation())
  span.addEventListener('click', onClick)
  el.appendChild(span)
  return el
}

type Props = {
  flights: Flight[]
  selectedAirport: string | null
  onSelectAirport: (iata: string | null) => void
}

export function GlobeView({ flights, selectedAirport, onSelectAirport }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  // ラベルのクリック処理は作成時に登録するため、最新のコールバックを参照できるようにしておく
  const onSelectRef = useRef(onSelectAirport)
  useEffect(() => {
    onSelectRef.current = onSelectAirport
  }, [onSelectAirport])

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

  const { arcs, airports } = useMemo(() => {
    const arcs: Arc[] = []
    const used = new Map<string, AirportLabel>()
    const add = (a: Airport) => {
      const entry = used.get(a.iata)
      if (entry) entry.count++
      else
        used.set(a.iata, {
          ...a,
          count: 1,
          el: createLabelElement(a.iata, a.iata === selectedAirport, () =>
            onSelectRef.current(a.iata),
          ),
        })
    }
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
      add(from)
      add(to)
    }
    // 選択中の空港を最優先に、次に利用回数の多い空港ほどラベルを優先して表示する
    const airports = [...used.values()].sort(
      (a, b) =>
        Number(b.iata === selectedAirport) - Number(a.iata === selectedAirport) ||
        b.count - a.count,
    )
    return { arcs, airports }
  }, [flights, selectedAirport])

  // 画面上で重なるラベルと、地球の裏側にあるラベルを隠す
  const declutter = useCallback(() => {
    const globe = globeRef.current
    if (!globe) return
    const cam = globe.camera().position
    const placed: { x: number; y: number }[] = []
    for (const a of airports) {
      const p = globe.getCoords(a.lat, a.lng, 0)
      // カメラから見て地球の手前側にあるか
      const facing = p.x * cam.x + p.y * cam.y + p.z * cam.z > 100 * 100
      const { x, y } = globe.getScreenCoords(a.lat, a.lng, 0)
      const overlaps = placed.some(
        (q) => Math.abs(q.y - y) < LABEL_HEIGHT && Math.abs(q.x - x) < LABEL_WIDTH,
      )
      const visible = facing && !overlaps
      a.el.classList.toggle('hidden', !visible)
      if (visible) placed.push({ x, y })
    }
  }, [airports])

  // データや画面サイズが変わったら、描画が終わった次のフレームで整理する
  useEffect(() => {
    const id = requestAnimationFrame(declutter)
    return () => cancelAnimationFrame(id)
  }, [declutter, size])

  return (
    <div ref={containerRef} className="globe-area">
      {/* 大きさ0で初期化するとカメラの縦横比が NaN になるため、表示領域が決まってから描画する */}
      {size.width > 0 && size.height > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          globeMaterial={oceanMaterial}
          backgroundImageUrl={`${import.meta.env.BASE_URL}night-sky.png`}
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
          onPointClick={(p) => onSelectAirport((p as AirportLabel).iata)}
          htmlElementsData={airports}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.012}
          htmlElement="el"
          htmlTransitionDuration={0}
          // 陸地（ポリゴン）や海をクリックしたら選択を解除する
          onGlobeClick={() => onSelectAirport(null)}
          onPolygonClick={() => onSelectAirport(null)}
          onZoom={declutter}
          onGlobeReady={() => {
            // 初期視点は東京付近
            globeRef.current?.pointOfView({ lat: 30, lng: 140, altitude: 2.2 }, 0)
            // カメラ位置が反映される次のフレームで整理する
            requestAnimationFrame(declutter)
          }}
        />
      )}
    </div>
  )
}
