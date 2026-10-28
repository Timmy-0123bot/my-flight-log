import { useEffect, useState } from 'react'
import { subscribeShare } from '../cloud'
import type { Flight } from '../types'
import { FlightLogView } from './FlightLogView'

type State =
  | { state: 'loading' }
  | { state: 'ready'; flights: Flight[] }
  | { state: 'missing' }
  | { state: 'error' }

// 共有ページ（?share=ID）。路線だけを閲覧のみで表示する
export function SharedView({ shareId }: { shareId: string }) {
  const [data, setData] = useState<State>({ state: 'loading' })

  useEffect(
    () =>
      subscribeShare(
        shareId,
        (routes) =>
          setData(
            routes
              ? // 共有データには ID が無いので、一覧と地図の強調表示用に並び順で振る
                { state: 'ready', flights: routes.map((r, i) => ({ id: String(i), ...r })) }
              : { state: 'missing' },
          ),
        () => setData({ state: 'error' }),
      ),
    [shareId],
  )

  const message =
    data.state === 'loading'
      ? '読み込み中…'
      : data.state === 'missing'
        ? 'この共有ページは公開が終了したか、URL が間違っています'
        : data.state === 'error'
          ? '共有ページを読み込めませんでした'
          : null

  return (
    <FlightLogView
      flights={data.state === 'ready' ? data.flights : []}
      notice={
        <p className={data.state === 'missing' || data.state === 'error' ? 'shared-notice error' : 'shared-notice'}>
          {message ?? '共有されたフライトログ（閲覧のみ）'}
        </p>
      }
      footer={() => (
        <a className="secondary small own-log-link" href={import.meta.env.BASE_URL}>
          自分のフライトログを作る →
        </a>
      )}
    />
  )
}
