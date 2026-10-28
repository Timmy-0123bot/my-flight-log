import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Flight } from './types'

// ユーザーごとに1つのドキュメント（users/{uid}）へ全フライトをまとめて保存する。
// 開くたびの読み込みが1回で済み、無料枠を圧迫しない
const userDoc = (uid: string) => doc(db, 'users', uid)

// 共有ページ用のドキュメント（shares/{shareId}）。誰でも読めるため、路線（出発・到着）だけを置く
const shareDoc = (shareId: string) => doc(db, 'shares', shareId)

export type CloudSnapshot = {
  // ドキュメントがまだ無ければ null
  flights: Flight[] | null
  // 共有ページを公開中ならその ID
  shareId: string | null
  // 端末内のキャッシュから返した結果か（true の間は、サーバー上の内容と違う可能性がある）
  fromCache: boolean
}

// クラウドのフライトを購読する。ほかの端末での変更も届く。
// キャッシュからの結果のあとに、サーバーで確認できた結果も必ず届くよう、メタデータの変化も受け取る
export function subscribeCloudFlights(
  uid: string,
  onData: (snapshot: CloudSnapshot) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userDoc(uid),
    { includeMetadataChanges: true },
    (snap) => {
      const data = snap.data()
      onData({
        flights: snap.exists() ? ((data?.flights as Flight[]) ?? []) : null,
        shareId: (data?.shareId as string | undefined) ?? null,
        fromCache: snap.metadata.fromCache,
      })
    },
    onError,
  )
}

// フライトだけを書き換える（merge なので、共有ページの ID などほかの項目は残る）
export function saveCloudFlights(uid: string, flights: Flight[]): Promise<void> {
  return setDoc(userDoc(uid), { flights, updatedAt: serverTimestamp() }, { merge: true })
}

export function saveUserShareId(uid: string, shareId: string | null): Promise<void> {
  return setDoc(userDoc(uid), { shareId }, { merge: true })
}

// 共有ページには路線だけを載せる（日付・便名・航空会社・ID は含めない）
export type SharedRoute = Pick<Flight, 'from' | 'to'>

export function saveShare(shareId: string, uid: string, flights: Flight[]): Promise<void> {
  const routes: SharedRoute[] = flights.map(({ from, to }) => ({ from, to }))
  return setDoc(shareDoc(shareId), { owner: uid, flights: routes, updatedAt: serverTimestamp() })
}

export function deleteShare(shareId: string): Promise<void> {
  return deleteDoc(shareDoc(shareId))
}

// 共有ページの路線を購読する。公開が止められていれば null
export function subscribeShare(
  shareId: string,
  onData: (routes: SharedRoute[] | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    shareDoc(shareId),
    (snap) => onData(snap.exists() ? ((snap.data().flights as SharedRoute[]) ?? []) : null),
    onError,
  )
}

// 推測されにくい共有用の ID（英数字20文字）
export function createShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}
