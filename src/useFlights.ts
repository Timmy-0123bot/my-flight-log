import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createShareId,
  deleteShare,
  saveCloudFlights,
  saveShare,
  saveUserShareId,
  subscribeCloudFlights,
} from './cloud'
import { auth, googleProvider } from './firebase'
import { loadFlights, saveFlights } from './storage'
import type { Flight } from './types'

export type SyncStatus =
  | { state: 'checking' } // ログイン状態を確認中
  | { state: 'local' } // 未ログイン（このブラウザにだけ保存）
  | { state: 'loading' } // ログイン済み・クラウドから読み込み中
  | { state: 'synced' } // ログイン済み・クラウドと同期中
  | { state: 'error'; message: string }

const migratedKey = (uid: string) => `my-flight-log:migrated:${uid}`

function isMigrated(uid: string): boolean {
  try {
    return localStorage.getItem(migratedKey(uid)) === '1'
  } catch {
    // 記録できない環境では毎回まとめる（IDで重複は防げる）
    return false
  }
}

function markMigrated(uid: string): void {
  try {
    localStorage.setItem(migratedKey(uid), '1')
  } catch {
    // 同上
  }
}

// 初回ログイン時に、このブラウザにある記録をクラウドへ移すための一覧を返す。
// クラウドに無いフライト（IDで判定）だけを足すので、両方にある記録は重複しない。
// 2回目以降はクラウドを正とする（別の端末で消した便が復活しないように）。書き込みが不要なら null
function migrate(uid: string, cloud: Flight[] | null, local: Flight[]): Flight[] | null {
  if (cloud === null) return local
  if (isMigrated(uid)) return null
  const cloudIds = new Set(cloud.map((f) => f.id))
  const missing = local.filter((f) => !cloudIds.has(f.id))
  return missing.length > 0 ? [...cloud, ...missing] : null
}

function errorMessage(e: unknown): string {
  const code = (e as { code?: string }).code
  if (code === 'permission-denied') return 'クラウドへのアクセスが許可されていません'
  if (code === 'unavailable') return 'クラウドに接続できません（オフラインの可能性）'
  return 'クラウドとの同期に失敗しました'
}

// フライト一覧と、その保存先（未ログインならこのブラウザ、ログイン中は Firestore）を管理する。
// ログイン中も同じ内容をこのブラウザに保存しておき、ログアウト後や起動直後の表示に使う
export function useFlights() {
  const [flights, setFlightsState] = useState<Flight[]>(loadFlights)
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<SyncStatus>({ state: 'checking' })
  const flightsRef = useRef(flights)
  // ログイン中、サーバー上の内容を一度確認できたか（それまでは編集をクラウドに送らない）
  const readyRef = useRef(false)
  // 共有ページを公開中ならその ID（フライトを変えたら共有ページにも反映する）
  const [shareId, setShareId] = useState<string | null>(null)
  const shareIdRef = useRef<string | null>(null)

  const apply = useCallback((next: Flight[]) => {
    flightsRef.current = next
    setFlightsState(next)
    saveFlights(next)
  }, [])

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        if (!u) {
          setStatus({ state: 'local' })
          shareIdRef.current = null
          setShareId(null)
        }
      }),
    [],
  )

  useEffect(() => {
    if (!user) return
    setStatus({ state: 'loading' })
    readyRef.current = false
    // 引っ越し用に、キャッシュの表示で上書きされる前のこのブラウザの記録を取っておく
    const local = loadFlights()
    let checkedServer = false
    return subscribeCloudFlights(
      user.uid,
      ({ flights: cloud, shareId: cloudShareId, fromCache }) => {
        shareIdRef.current = cloudShareId
        setShareId(cloudShareId)
        if (!checkedServer) {
          // 新しい端末ではキャッシュが空のため「まだ記録なし」に見えることがある。
          // それを信じて引っ越すとクラウドの記録を上書きしかねないので、
          // サーバーで確認できるまでは、キャッシュにある記録を表示するだけにする
          if (fromCache) {
            if (cloud) {
              apply(cloud)
              // この端末で同期したことがあり、キャッシュに記録があるなら、オフラインでも編集してよい
              // （変更は端末に保存され、つながったときにクラウドへ送られる）
              if (isMigrated(user.uid)) readyRef.current = true
            }
            return
          }
          checkedServer = true
          readyRef.current = true
          const merged = migrate(user.uid, cloud, local)
          if (merged) {
            // 書き込むと購読に新しい内容が届くので、表示はそこで更新する。
            // 引っ越し済みの印は、書き込みに成功してから付ける
            saveCloudFlights(user.uid, merged)
              .then(() => markMigrated(user.uid))
              .then(() => (cloudShareId ? saveShare(cloudShareId, user.uid, merged) : undefined))
              .catch((e) => setStatus({ state: 'error', message: errorMessage(e) }))
            return
          }
          markMigrated(user.uid)
        }
        apply(cloud ?? [])
        setStatus({ state: 'synced' })
      },
      (e) => setStatus({ state: 'error', message: errorMessage(e) }),
    )
  }, [user, apply])

  // 使い方は useState の更新関数と同じ（前の一覧を受け取って新しい一覧を返す）
  const updateFlights = useCallback(
    (updater: (prev: Flight[]) => Flight[]) => {
      if (user && !readyRef.current) {
        alert('クラウドから記録を読み込み中です。少し待ってからもう一度お試しください')
        return
      }
      const next = updater(flightsRef.current)
      apply(next)
      if (user) {
        const fail = (e: unknown) => setStatus({ state: 'error', message: errorMessage(e) })
        saveCloudFlights(user.uid, next).catch(fail)
        if (shareIdRef.current) saveShare(shareIdRef.current, user.uid, next).catch(fail)
      }
    },
    [user, apply],
  )

  // 共有ページを公開する。すでに公開中なら新しい URL に作り直す（前の URL は見られなくなる）
  const publishShare = useCallback(async () => {
    if (!user || !readyRef.current) return
    const previous = shareIdRef.current
    const next = createShareId()
    try {
      await saveShare(next, user.uid, flightsRef.current)
      await saveUserShareId(user.uid, next)
      if (previous) await deleteShare(previous)
    } catch (e) {
      setStatus({ state: 'error', message: errorMessage(e) })
    }
  }, [user])

  // 共有ページの公開をやめる（URL を開いても見られなくなる）
  const unpublishShare = useCallback(async () => {
    const current = shareIdRef.current
    if (!user || !current) return
    try {
      await saveUserShareId(user.uid, null)
      await deleteShare(current)
    } catch (e) {
      setStatus({ state: 'error', message: errorMessage(e) })
    }
  }, [user])

  const signIn = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      const code = (e as { code?: string }).code
      // 自分でポップアップを閉じた場合は何もしない
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
      alert(
        code === 'auth/popup-blocked'
          ? 'ログイン用のウィンドウがブロックされました。ポップアップを許可してもう一度お試しください'
          : 'ログインに失敗しました',
      )
    }
  }, [])

  const signOutUser = useCallback(() => signOut(auth), [])

  return {
    flights,
    updateFlights,
    user,
    status,
    signIn,
    signOut: signOutUser,
    shareId,
    publishShare,
    unpublishShare,
  }
}
