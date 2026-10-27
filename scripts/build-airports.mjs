// OurAirports の公開データから、IATAコード付きの定期便空港だけを抜き出して
// src/data/airports.json を生成する。実行: npm run build:airports
import { writeFile } from 'node:fs/promises'

const SOURCE = 'https://davidmegginson.github.io/ourairports-data/airports.csv'
const OUTPUT = new URL('../src/data/airports.json', import.meta.url)

// ダブルクォート内のカンマ・改行を考慮した最小限のCSVパーサ
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`ダウンロード失敗: ${res.status}`)
const [header, ...rows] = parseCsv(await res.text())
const col = Object.fromEntries(header.map((name, i) => [name, i]))

const airports = rows
  .filter((r) => /^[A-Z]{3}$/.test(r[col.iata_code] ?? ''))
  .filter((r) => r[col.scheduled_service] === 'yes')
  .filter((r) => ['large_airport', 'medium_airport', 'small_airport'].includes(r[col.type]))
  .map((r) => ({
    iata: r[col.iata_code],
    name: r[col.name],
    city: r[col.municipality],
    country: r[col.iso_country],
    lat: Math.round(Number(r[col.latitude_deg]) * 1e4) / 1e4,
    lng: Math.round(Number(r[col.longitude_deg]) * 1e4) / 1e4,
  }))
  .sort((a, b) => a.iata.localeCompare(b.iata))

await writeFile(OUTPUT, JSON.stringify(airports))
console.log(`${airports.length} 件の空港を書き出しました`)
