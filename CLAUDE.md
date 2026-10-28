# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code へのガイドです。

## プロジェクト概要

- **プロジェクト名**: my-flight-log
- **内容**: フライトログアプリ（搭乗したフライトの記録・管理を行うアプリ）

## コミュニケーション

- 返答は必ず**日本語**で行うこと。
- コードのコメントやコミットメッセージも、特に理由がなければ日本語で書く。

## Git 運用ルール

- **コードを変更するたびに、コミットして GitHub にプッシュすること。**
  - 変更が一区切りついたら `git add` → `git commit` → `git push` まで行う。
  - 変更内容が分かる簡潔なコミットメッセージを付ける（例: `フライト一覧画面を追加`）。
- プッシュ前に、動作確認やテストが可能であれば実施する。
- 機密情報（APIキー、パスワード、`.env` など）はコミットしない。`.gitignore` で除外する。

## 開発メモ

- 技術スタック: React + TypeScript + Vite、地球儀は react-globe.gl（three.js）
- データ保存: 未ログインはブラウザの localStorage（`src/storage.ts`）、Google ログイン中は Firestore の `users/{uid}` ドキュメント1つに全フライトをまとめて保存（`src/cloud.ts`）。切り替えと初回ログイン時の引っ越しは `src/useFlights.ts`。ログイン中も localStorage に同じ内容を保存している
- Firebase: 無料の Spark プランのまま使う（Blaze が必要な機能は使わない）。`src/firebase.ts` のウェブ設定は公開情報なのでコミットしてよい。セキュリティルールは `firestore.rules` で管理し、変更したら Firebase コンソールの「Firestore Database → ルール」に貼り付けて公開する
- 共有ページ: `shares/{shareId}` に路線（from/to）だけを保存し、`?share=ID` で閲覧のみ表示（`src/components/SharedView.tsx`）。日付・便名・航空会社は共有データに含めない（プライバシーのため、表示で隠すのではなく保存しない）。shareId は `users/{uid}.shareId` に持ち、フライトを変更するたびに共有データも更新する。ルールで get のみ許可し list は禁止（他人の共有ページを探せないように）
- 初回ログイン時の引っ越しは、サーバーで確認できた内容（キャッシュではない）を見てから行う。新しい端末ではキャッシュが空で「記録なし」に見え、クラウドを上書きしかねないため
- 空港データ: OurAirports の公開データから `npm run build:airports` で `src/data/airports.json` を生成（IATAコード付きの定期便空港のみ）
- コマンド: `npm run dev`（開発サーバー）、`npm run build`（型チェック＋ビルド）
- デザイン: 暗い色ベースの球状地図、路線は白い線（国内線はアンバー）
- 地図: world-atlas（Natural Earth 1:50m）から `npm run build:textures` で `public/land.webp` を事前生成し、地球に貼っている。国ごとの3Dポリゴン描画は初回表示に十数秒かかったため使わない。陸地や国境線の色を変えるときは `scripts/build-textures.mjs` を編集して再生成する
- 空港検索は3レターコードまたは英語（都市名・空港名）
- フライトの必須項目は出発・到着空港のみ。日付・便名・航空会社は任意
- 日付は `YYYY` / `YYYY-MM` / `YYYY-MM-DD` のいずれか（年だけ・年月だけも可）。文字列比較でそのまま並べ替えられる形にしている。将来、一覧を年ごとに折りたたむ表示（案B）に移行する予定
- 総距離・地球○周分・国内線/国際線の件数は、絞り込み（全て/国内線/国際線、空港選択）に関係なく全フライトで集計する
- バックアップは JSON（`{ app: "my-flight-log", version: 1, exportedAt, flights }`）。読み込みは現在のデータを置き換える

## 公開（GitHub Pages）

- URL: https://timmy-0123bot.github.io/my-flight-log/
- `main` へのプッシュで `.github/workflows/deploy.yml` が自動でビルド・公開する
- 公開先がサブパスのため、`vite.config.ts` でビルド/プレビュー時のみ `base: '/my-flight-log/'` にしている。`public/` のファイルを参照するときは `import.meta.env.BASE_URL` を前に付ける（`/xxx.png` のような絶対パスは公開先で壊れる）
- 公開版の確認: `npm run build` → `npm run preview` → http://localhost:4173/my-flight-log/
