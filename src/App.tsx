import { AccountControls } from './components/AccountControls'
import { BackupControls } from './components/BackupControls'
import { FlightLogView } from './components/FlightLogView'
import { ShareControls } from './components/ShareControls'
import { SharedView } from './components/SharedView'
import { useFlights } from './useFlights'

export default function App() {
  // ?share=ID で開いたときは、その共有ページを閲覧のみで表示する
  const shareId = new URLSearchParams(location.search).get('share')
  return shareId ? <SharedView shareId={shareId} /> : <OwnFlightLog />
}

// 自分のフライトログ（追加・編集・同期・共有・バックアップができる）
function OwnFlightLog() {
  const {
    flights,
    updateFlights,
    user,
    status,
    signIn,
    signOut,
    shareId,
    publishShare,
    unpublishShare,
  } = useFlights()

  return (
    <FlightLogView
      flights={flights}
      onChangeFlights={updateFlights}
      footer={(reset) => (
        <>
          <AccountControls user={user} status={status} onSignIn={signIn} onSignOut={signOut} />
          <ShareControls
            available={user !== null && status.state === 'synced'}
            shareId={shareId}
            onPublish={publishShare}
            onUnpublish={unpublishShare}
          />
          <BackupControls
            flights={flights}
            onImport={(imported) => {
              updateFlights(() => imported)
              reset()
            }}
          />
        </>
      )}
    />
  )
}
