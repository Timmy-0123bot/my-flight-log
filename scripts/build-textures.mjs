// 地球儀に貼る地図画像（public/land.webp）と、背景の星空画像（public/night-sky.webp）を生成する。
// ブラウザで毎回描くと初回表示が遅くなるため、事前に画像にしておく。実行: npm run build:textures
import { readFile, writeFile } from 'node:fs/promises'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { geoEquirectangular, geoPath } from 'd3-geo'
import { feature, mesh } from 'topojson-client'

const COLORS = {
  ocean: '#0b1a2e',
  land: '#34425a',
  border: '#7a8aa6',
}

// 正距円筒図法なので横:縦 = 2:1。8192px で赤道上 1px ≒ 5km となり、日本の島々の形も判別できる
const WIDTH = 8192
const HEIGHT = WIDTH / 2

const publicDir = new URL('../public/', import.meta.url)

async function buildLand() {
  // Natural Earth 1:50m の国境データ
  const topology = JSON.parse(
    await readFile(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)),
  )
  const countries = feature(topology, topology.objects.countries)

  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = COLORS.ocean
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // 経度 -180〜180 を横幅いっぱい、緯度 90〜-90 を縦幅いっぱいに対応させる
  const projection = geoEquirectangular()
    .scale(WIDTH / (2 * Math.PI))
    .translate([WIDTH / 2, HEIGHT / 2])
  const path = geoPath(projection, ctx)

  ctx.beginPath()
  path(countries)
  ctx.fillStyle = COLORS.land
  ctx.fill()

  // 海岸線と国境線を、隣り合う国で重複しないよう1本ずつ描く
  ctx.beginPath()
  path(mesh(topology, topology.objects.countries))
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  ctx.strokeStyle = COLORS.border
  ctx.stroke()

  const out = await canvas.encode('webp', 90)
  await writeFile(new URL('land.webp', publicDir), out)
  console.log(`land.webp: ${(out.length / 1024).toFixed(0)} KB`)
}

async function buildNightSky() {
  // 元画像は three-globe のサンプル（MIT License）。scripts/assets に置いてある
  // 縮小すると星がぼやけるため大きさは元のまま（4096x2048）にし、圧縮率だけ上げる
  const image = await loadImage(await readFile(new URL('./assets/night-sky.png', import.meta.url)))
  const canvas = createCanvas(image.width, image.height)
  canvas.getContext('2d').drawImage(image, 0, 0)
  const out = await canvas.encode('webp', 60)
  await writeFile(new URL('night-sky.webp', publicDir), out)
  console.log(`night-sky.webp: ${(out.length / 1024).toFixed(0)} KB`)
}

await buildLand()
await buildNightSky()
