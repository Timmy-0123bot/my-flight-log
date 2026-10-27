import { useId } from 'react'

type Props = {
  // 'YYYY' / 'YYYY-MM' / 'YYYY-MM-DD'、未入力は ''
  value: string
  onChange: (value: string) => void
}

const OLDEST_YEAR = 1950

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

const pad = (n: number) => String(n).padStart(2, '0')

// 年だけ・年月だけでも入力できる日付欄。月は年を、日は月を選んでから選べる
export function DateInput({ value, onChange }: Props) {
  const id = useId()
  const [y = '', m = '', d = ''] = value ? value.split('-') : []
  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: thisYear + 1 - OLDEST_YEAR + 1 }, (_, i) => thisYear + 1 - i)
  const days = y && m ? daysInMonth(Number(y), Number(m)) : 31

  function update(year: string, month: string, day: string) {
    if (!year) return onChange('')
    if (!month) return onChange(year)
    // 年や月を変えて日が存在しなくなったら（2/30 など）、その月の末日に寄せる
    const maxDay = daysInMonth(Number(year), Number(month))
    const fixedDay = day && Number(day) > maxDay ? pad(maxDay) : day
    onChange(fixedDay ? `${year}-${month}-${fixedDay}` : `${year}-${month}`)
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={`${id}-year`}>
        日付（任意・年だけ／年月だけでも可）
      </label>
      <div className="date-input">
        <select id={`${id}-year`} value={y} onChange={(e) => update(e.target.value, m, d)}>
          <option value="">年</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}年
            </option>
          ))}
        </select>
        <select
          aria-label="月"
          value={m}
          disabled={!y}
          onChange={(e) => update(y, e.target.value, d)}
        >
          <option value="">月</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={pad(i + 1)}>
              {i + 1}月
            </option>
          ))}
        </select>
        <select
          aria-label="日"
          value={d}
          disabled={!m}
          onChange={(e) => update(y, m, e.target.value)}
        >
          <option value="">日</option>
          {Array.from({ length: days }, (_, i) => (
            <option key={i} value={pad(i + 1)}>
              {i + 1}日
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
