import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { Flight } from './types'

// ユーザーごとに1つのドキュメント（users/{uid}）へ全フライトをまとめて保存する。
// 開くたびの読み込みが1回で済み、無料枠を圧迫しない
const userDoc = (uid: string) => doc(db, 'users', uid)

export type CloudSnapshot = {
  // ドキュメントがまだ無ければ null
  flights: Flight[] | null
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
    (snap) =>
      onData({
        flights: snap.exists() ? ((snap.data().flights as Flight[]) ?? []) : null,
        fromCache: snap.metadata.fromCache,
      }),
    onError,
  )
}

export function saveCloudFlights(uid: string, flights: Flight[]): Promise<void> {
  return setDoc(userDoc(uid), { flights, updatedAt: serverTimestamp() })
}
