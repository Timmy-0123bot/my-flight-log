import { useMemo, useState } from 'react'
import { searchAirports } from '../airports'
import type { Airport } from '../types'

type Props = {
  label: string
  value: Airport | null
  onChange: (airport: Airport | null) => void
}

export function AirportInput({ label, value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const results = useMemo(() => searchAirports(query), [query])

  function select(airport: Airport) {
    onChange(airport)
    setQuery('')
    setOpen(false)
  }

  if (value) {
    return (
      <div className="field">
        <span className="field-label">{label}</span>
        <div className="airport-selected">
          <strong>{value.iata}</strong>
          <span>{value.city || value.name}</span>
          <button type="button" className="link" onClick={() => onChange(null)}>
            変更
          </button>
        </div>
      </div>
    )
  }

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="combo">
        <input
          value={query}
          placeholder="HND / Tokyo"
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((i) => Math.min(i + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter' && results[active]) {
              e.preventDefault()
              select(results[active])
            }
          }}
        />
        {open && results.length > 0 && (
          <ul className="combo-list">
            {results.map((a, i) => (
              <li
                key={a.iata}
                className={i === active ? 'active' : ''}
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(a)
                }}
              >
                <strong>{a.iata}</strong>
                <span>
                  {a.city ? `${a.city}, ` : ''}
                  {a.country}
                </span>
                <small>{a.name}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </label>
  )
}
