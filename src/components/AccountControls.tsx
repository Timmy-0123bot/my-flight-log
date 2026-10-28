import type { User } from 'firebase/auth'
import type { SyncStatus } from '../useFlights'

type Props = {
  user: User | null
  status: SyncStatus
  onSignIn: () => void
  onSignOut: () => void
}

const STATUS_TEXT: Record<SyncStatus['state'], string> = {
  checking: 'ログイン状態を確認中…',
  local: 'このブラウザにだけ保存しています',
  loading: 'クラウドから読み込み中…',
  synced: 'クラウドと同期しています',
  error: '',
}

export function AccountControls({ user, status, onSignIn, onSignOut }: Props) {
  const text = status.state === 'error' ? status.message : STATUS_TEXT[status.state]

  return (
    <section className="account">
      <span className="field-label">同期</span>
      <p className={status.state === 'error' ? 'account-status error' : 'account-status'}>
        {text}
      </p>
      {user ? (
        <div className="account-user">
          <span title={user.email ?? undefined}>{user.displayName ?? user.email}</span>
          <button
            type="button"
            className="link"
            onClick={() => {
              if (confirm('ログアウトしますか？（記録はクラウドに残ります）')) onSignOut()
            }}
          >
            ログアウト
          </button>
        </div>
      ) : (
        status.state !== 'checking' && (
          <button type="button" className="secondary small" onClick={onSignIn}>
            Google でログインして PC・スマホで同期
          </button>
        )
      )}
    </section>
  )
}
