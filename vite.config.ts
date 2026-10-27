import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // GitHub Pages では https://<user>.github.io/my-flight-log/ で配信されるため、
  // ビルドとそのプレビュー時だけパスを合わせる（開発サーバーは / のまま）
  base: command === 'build' || isPreview ? '/my-flight-log/' : '/',
}))
