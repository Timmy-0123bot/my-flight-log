import { useRef } from 'react'
import { exportFlights, parseBackup } from '../storage'
import type { Flight } from '../types'

type Props = {
  flights: Flight[]
  onImport: (flights: Flight[]) => void
}

export function BackupControls({ flights, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    try {
      const imported = parseBackup(await file.text())
      const message =
        `${imported.length} 件のフライトを読み込みます。\n` +
        `現在の ${flights.length} 件は置き換えられます。よろしいですか？`
      if (confirm(message)) onImport(imported)
    } catch (e) {
      alert(`読み込みに失敗しました：${(e as Error).message}`)
    }
  }

  return (
    <section className="backup">
      <span className="field-label">バックアップ</span>
      <div className="backup-actions">
        <button
          type="button"
          className="secondary small"
          disabled={flights.length === 0}
          onClick={() => exportFlights(flights)}
        >
          書き出し
        </button>
        <button type="button" className="secondary small" onClick={() => fileRef.current?.click()}>
          読み込み
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          // 同じファイルを続けて選んでも反応するようにリセットする
          e.target.value = ''
        }}
      />
    </section>
  )
}
