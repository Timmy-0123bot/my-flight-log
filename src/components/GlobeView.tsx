import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { distanceKm, findAirport, isDomestic, midpoint, ROUTE_COLORS } from '../airports'
import type { Airport, Flight } from '../types'

type Arc = {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string
  stroke: number
}

// 強調表示中は、それ以外の路線をこの不透明度で薄く描く
const DIMMED_ALPHA = 0.2

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const INITIAL_ALTITUDE = 2.2

// 路線の線や空港の点は地球上の太さで描かれ、拡大するほど画面上で太くなる。
// 初期視点を基準に、カメラの高さに応じて細くする係数を返す。
// 回転・拡大中は毎フレーム呼ばれるため、√2 刻みに丸めて再描画の回数を抑える
function zoomScaleFor(altitude: number): number {
  const steps = Math.round(Math.log2(altitude / INITIAL_ALTITUDE) * 2) / 2
  return Math.min(1, Math.max(1 / 16, 2 ** steps))
}

// 地図画像・背景画像は scripts/build-textures.mjs で事前に生成したもの
const GLOBE_IMAGE = `${import.meta.env.BASE_URL}land.webp`
const BACKGROUND_IMAGE = `${import.meta.env.BASE_URL}night-sky.webp`

type AirportLabel = Airport & { count: number; el: HTMLElement }

// ラベル（3レターコード）1つぶんの画面上の大きさ（px）。重なり判定に使う
const LABEL_WIDTH = 30
const LABEL_HEIGHT = 14
// 重なり判定で、空港の点が占める大きさ（px）
const POINT_SIZE = 6

type Rect = { left: number; top: number; right: number; bottom: number }

// ラベルを置く候補の位置（点の右上を優先し、重なるなら順に試す）。
// クラス名は index.css の .airport-label.pos-* と対応する
const LABEL_POSITIONS: { className: string; rect: (x: number, y: number) => Rect }[] = [
  { className: 'pos-right', rect: (x, y) => box(x + 5, y - 2 - LABEL_HEIGHT) },
  { className: 'pos-left', rect: (x, y) => box(x - 5 - LABEL_WIDTH, y - 2 - LABEL_HEIGHT) },
  { className: 'pos-top', rect: (x, y) => box(x - LABEL_WIDTH / 2, y - 6 - LABEL_HEIGHT) },
  { className: 'pos-bottom', rect: (x, y) => box(x - LABEL_WIDTH / 2, y + 6) },
]

function box(left: number, top: number): Rect {
  return { left, top, right: left + LABEL_WIDTH, bottom: top + LABEL_HEIGHT }
}

function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

// 画面上で常に同じ大きさになるHTMLラベル。外側の要素が空港の位置に置かれ、文字は点の周りに出す
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
  // 一覧で選ばれ、地図上で強調表示するフライト
  focusedFlightId: string | null
  onSelectAirport: (iata: string) => void
  onBackgroundClick: () => void
}

export function GlobeView({
  flights,
  selectedAirport,
  focusedFlightId,
  onSelectAirport,
  onBackgroundClick,
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [zoomScale, setZoomScale] = useState(1)

  // 強調するフライトが選ばれたら、その路線が収まるようにカメラを移動する。
  // 絞り込みの切り替えなどで flights が変わっただけでは動かさないよう、flights は ref で参照する
  const flightsRef = useRef(flights)
  useEffect(() => {
    flightsRef.current = flights
  }, [flights])
  useEffect(() => {
    const flight = flightsRef.current.find((f) => f.id === focusedFlightId)
    const from = flight && findAirport(flight.from)
    const to = flight && findAirport(flight.to)
    if (!from || !to) return
    // 距離が長い路線ほど引いて見る（国内線は寄り、長距離国際線は地球全体に近い高さ）
    const altitude = Math.min(2.5, Math.max(0.6, distanceKm(from, to) / 4000))
    globeRef.current?.pointOfView({ ...midpoint(from, to), altitude }, 1000)
  }, [focusedFlightId])

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
    const hasFocus = flights.some((f) => f.id === focusedFlightId)
    for (const f of flights) {
      const from = findAirport(f.from)
      const to = findAirport(f.to)
      if (!from || !to) continue
      const color = isDomestic(from, to) ? ROUTE_COLORS.domestic : ROUTE_COLORS.international
      const focused = f.id === focusedFlightId
      arcs.push({
        startLat: from.lat,
        startLng: from.lng,
        endLat: to.lat,
        endLng: to.lng,
        color: hasFocus && !focused ? withAlpha(color, DIMMED_ALPHA) : color,
        stroke: focused ? 1.2 : 0.5,
      })
      add(from)
      add(to)
    }
    // 選択中の空港と強調中の路線の空港を最優先に、次に利用回数の多い空港ほどラベルを優先して表示する
    const focused = flights.find((f) => f.id === focusedFlightId)
    const priority = (a: Airport) =>
      Number(a.iata === selectedAirport || a.iata === focused?.from || a.iata === focused?.to)
    const airports = [...used.values()].sort(
      (a, b) => priority(b) - priority(a) || b.count - a.count,
    )
    return { arcs, airports }
  }, [flights, selectedAirport, focusedFlightId])

  // 各ラベルを、ほかのラベルや空港の点と重ならない位置に置く。どこにも置けないラベルと、
  // 地球の裏側にあるラベルは隠す（優先度の高い空港から順に場所を決める）
  const declutter = useCallback(() => {
    const globe = globeRef.current
    if (!globe) return
    const cam = globe.camera().position
    const screen = airports.map((a) => {
      const p = globe.getCoords(a.lat, a.lng, 0)
      // カメラから見て地球の手前側にあるか
      const facing = p.x * cam.x + p.y * cam.y + p.z * cam.z > 100 * 100
      return { ...globe.getScreenCoords(a.lat, a.lng, 0), facing }
    })
    // 空港の点の上にはラベルを重ねない
    const occupied: Rect[] = screen
      .filter((s) => s.facing)
      .map(({ x, y }) => ({
        left: x - POINT_SIZE / 2,
        top: y - POINT_SIZE / 2,
        right: x + POINT_SIZE / 2,
        bottom: y + POINT_SIZE / 2,
      }))
    airports.forEach((a, i) => {
      const { x, y, facing } = screen[i]
      const position = facing
        ? LABEL_POSITIONS.find((pos) => {
            const rect = pos.rect(x, y)
            return !occupied.some((o) => intersects(o, rect))
          })
        : undefined
      a.el.classList.toggle('hidden', !position)
      for (const pos of LABEL_POSITIONS) a.el.classList.toggle(pos.className, pos === position)
      if (position) occupied.push(position.rect(x, y))
    })
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
          globeImageUrl={GLOBE_IMAGE}
          backgroundImageUrl={BACKGROUND_IMAGE}
          atmosphereColor="#6b8cff"
          atmosphereAltitude={0.18}
          arcsData={arcs}
          arcColor="color"
          arcStroke={(d) => (d as Arc).stroke * zoomScale}
          arcAltitudeAutoScale={0.4}
          pointsData={airports}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => '#ffffff'}
          pointAltitude={0.008}
          pointRadius={0.25 * zoomScale}
          onPointClick={(p) => onSelectAirport((p as AirportLabel).iata)}
          htmlElementsData={airports}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.012}
          htmlElement="el"
          htmlTransitionDuration={0}
          // 地球（陸地・海）をクリックしたら空港の選択と路線の強調を解除する
          onGlobeClick={onBackgroundClick}
          onZoom={({ altitude }) => {
            declutter()
            setZoomScale(zoomScaleFor(altitude))
          }}
          onGlobeReady={() => {
            // 初期視点は東京付近
            globeRef.current?.pointOfView({ lat: 30, lng: 140, altitude: INITIAL_ALTITUDE }, 0)
            // カメラ位置が反映される次のフレームで整理する
            requestAnimationFrame(declutter)
          }}
        />
      )}
    </div>
  )
}
