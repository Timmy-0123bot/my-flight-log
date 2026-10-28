import { useState } from 'react'

type Props = {
  // ログインしていて、クラウドと同期できているか（共有にはログインが必要）
  available: boolean
  shareId: string | null
  onPublish: () => Promise<void>
  onUnpublish: () => Promise<void>
}

function shareUrl(shareId: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}?share=${shareId}`
}

export function ShareControls({ available, shareId, onPublish, onUnpublish }: Props) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // クリップボードが使えない環境では、手で選択してコピーしてもらう
      prompt('この URL をコピーしてください', url)
    }
  }

  return (
    <section className="share">
      <span className="field-label">共有ページ</span>
      {!available ? (
        <p className="account-status">ログインすると、路線を見せる共有ページを作れます</p>
      ) : shareId ? (
        <>
          <p className="account-status">
            この URL を知っている人は、路線だけを見られます（編集はできません）
          </p>
          <div className="share-url">
            <input readOnly value={shareUrl(shareId)} onFocus={(e) => e.target.select()} />
            <button type="button" className="secondary small" onClick={() => copy(shareUrl(shareId))}>
              {copied ? 'コピーしました' : 'コピー'}
            </button>
          </div>
          <div className="backup-actions">
            <button
              type="button"
              className="secondary small"
              disabled={busy}
              onClick={() => {
                if (confirm('URL を作り直しますか？（前の URL は見られなくなります）')) run(onPublish)
              }}
            >
              URL を作り直す
            </button>
            <button
              type="button"
              className="secondary small"
              disabled={busy}
              onClick={() => {
                if (confirm('共有ページの公開をやめますか？')) run(onUnpublish)
              }}
            >
              公開をやめる
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="account-status">
            路線（空港と距離）だけを公開します。日付・便名・航空会社は含みません
          </p>
          <button
            type="button"
            className="secondary small"
            disabled={busy}
            onClick={() => run(onPublish)}
          >
            共有ページを作る
          </button>
        </>
      )}
    </section>
  )
}
