import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

// Firebase のウェブ用設定。ブラウザに配信される公開情報で、秘密の鍵ではない。
// データの保護は Firestore のセキュリティルール（firestore.rules）で行う
const firebaseConfig = {
  apiKey: 'AIzaSyCxv1LG0lQVer4EorstxpOIG6ksFDF8thk',
  authDomain: 'my-flight-log-14f7e.firebaseapp.com',
  projectId: 'my-flight-log-14f7e',
  storageBucket: 'my-flight-log-14f7e.firebasestorage.app',
  messagingSenderId: '974971010863',
  appId: '1:974971010863:web:77b0f8d1b4e9e1021debda',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

export const db = initializeFirestore(app, {
  // Flight の任意項目（undefined）をそのまま保存できるようにする
  ignoreUndefinedProperties: true,
  // オフライン中の変更は端末に保存しておき、つながったときに送る
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
