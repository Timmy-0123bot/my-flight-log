import { useState } from 'react'
import type { Airport, Flight } from '../types'
import { AirportInput } from './AirportInput'

type Props = {
  onAdd: (flight: Flight) => void
}

export function FlightForm({ onAdd }: Props) {
  const [from, setFrom] = useState<Airport | null>(null)
  const [to, setTo] = useState<Airport | null>(null)
  const [date, setDate] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [airline, setAirline] = useState('')

  const canSubmit = from && to && from.iata !== to.iata

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!from || !to || !canSubmit) return
    onAdd({
      id: crypto.randomUUID(),
      from: from.iata,
      to: to.iata,
      date: date || undefined,
      flightNumber: flightNumber.trim().toUpperCase() || undefined,
      airline: airline.trim() || undefined,
    })
    // 乗り継ぎを続けて入力しやすいよう、到着地を次の出発地にする
    setFrom(to)
    setTo(null)
    setFlightNumber('')
  }

  return (
    <form className="flight-form" onSubmit={handleSubmit}>
      <div className="row">
        <AirportInput label="出発" value={from} onChange={setFrom} />
        <AirportInput label="到着" value={to} onChange={setTo} />
      </div>
      <div className="row">
        <label className="field">
          <span className="field-label">日付（任意）</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">便名</span>
          <input
            value={flightNumber}
            placeholder="NH879"
            onChange={(e) => setFlightNumber(e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        <span className="field-label">航空会社</span>
        <input value={airline} placeholder="ANA" onChange={(e) => setAirline(e.target.value)} />
      </label>
      <button type="submit" className="primary" disabled={!canSubmit}>
        フライトを追加
      </button>
    </form>
  )
}
