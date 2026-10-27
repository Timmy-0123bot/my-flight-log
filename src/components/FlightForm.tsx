import { useState } from 'react'
import { findAirport } from '../airports'
import type { Airport, Flight } from '../types'
import { AirportInput } from './AirportInput'
import { DateInput } from './DateInput'

type Props = {
  // 指定すると編集モード（その内容を初期値にし、保存時は同じIDで返す）
  initial?: Flight
  onSubmit: (flight: Flight) => void
  onClose: () => void
}

export function FlightForm({ initial, onSubmit, onClose }: Props) {
  const isEdit = initial !== undefined
  const [from, setFrom] = useState<Airport | null>(
    () => (initial && findAirport(initial.from)) || null,
  )
  const [to, setTo] = useState<Airport | null>(() => (initial && findAirport(initial.to)) || null)
  const [date, setDate] = useState(initial?.date ?? '')
  const [flightNumber, setFlightNumber] = useState(initial?.flightNumber ?? '')
  const [airline, setAirline] = useState(initial?.airline ?? '')

  const canSubmit = from && to && from.iata !== to.iata

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!from || !to || !canSubmit) return
    onSubmit({
      id: initial?.id ?? crypto.randomUUID(),
      from: from.iata,
      to: to.iata,
      date: date || undefined,
      flightNumber: flightNumber.trim().toUpperCase() || undefined,
      airline: airline.trim() || undefined,
    })
    if (isEdit) return
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
      <DateInput value={date} onChange={setDate} />
      <div className="row">
        <label className="field">
          <span className="field-label">便名</span>
          <input
            value={flightNumber}
            placeholder="NH879"
            onChange={(e) => setFlightNumber(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">航空会社</span>
          <input value={airline} placeholder="ANA" onChange={(e) => setAirline(e.target.value)} />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="secondary" onClick={onClose}>
          {isEdit ? 'キャンセル' : '閉じる'}
        </button>
        <button type="submit" className="primary" disabled={!canSubmit}>
          {isEdit ? '保存' : '追加'}
        </button>
      </div>
    </form>
  )
}
