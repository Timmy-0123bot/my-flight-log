# My Flight Log

乗ったフライトを記録して、地球儀の上に路線を描く個人用のフライトログアプリです。

**公開版:** https://timmy-0123bot.github.io/my-flight-log/

![アプリの画面](docs/screenshot.png)

## 主な機能

- **地球儀で路線を表示**: 暗い色の地球儀に、記録したフライトを弧線で描きます。国内線はアンバー、国際線は白です。
  - 空港コードのラベルは、ほかのラベルと重ならない位置に自動で置きます。HND と NRT のように近い空港も、左右に分かれて両方表示されます。
  - 拡大しても、路線の線や空港の点は太くなりすぎません。
- **空港検索**: 3レターコード（`HND`）か、英語の都市名・空港名（`Christchurch`）で探せます。収録は定期便が飛ぶ世界の約4,000空港です。
- **かんたん入力**: 必須は出発と到着の空港だけで、日付・便名・航空会社は空欄でも登録できます。日付は年だけ・年と月だけでも入れられます。1便追加すると到着地が次の出発地に入るので、乗り継ぎを続けて入力できます。
- **一覧**: 新しい順に5件を表示し、残りは「すべて表示」で開きます。日付を入れていない便は、一覧の上のほうに追加の新しい順で並びます。
- **編集・削除**: 一覧の「編集」で、登録したフライトの空港・日付・便名・航空会社をその場で直せます。「削除」は確認のうえ消します。
- **集計**: 総フライト数、総飛行距離（大圏距離）、地球何周分か、国内線・国際線それぞれの便数を表示します。集計は、下の絞り込みに関係なく全フライトが対象です。
- **絞り込み**:
  - 「全て / 国内線 / 国際線」のボタンで、地図と一覧に出す路線を切り替えます。
  - 地図上の空港コードを押すと、その空港を発着する路線だけになります。
  - パネルの「よく使う空港」のボタン（利用回数の多い順に6つ）からも、同じように空港を選べます。
  - 同じ空港をもう一度押すか、地図の何もないところを押すと元に戻ります。
- **一覧から地図へ移動**: 一覧のフライトを押すと、地図がその路線まで回り、その線を太く表示してほかの線を薄くします。もう一度押すか、地図の何もないところを押すと元に戻ります。
- **PC・スマホで同期**: Google でログインすると、記録がクラウドに保存され、同じアカウントでログインしたどの端末でも同じ記録を見たり追加したりできます。ログインしなくても、そのブラウザの中だけで使えます。
- **共有ページ**: ログイン中に「共有ページを作る」を押すと、見るだけの共有用 URL ができます。URL を知っている人は路線（空港と距離）だけを見られ、日付・便名・航空会社は含みません。編集はできません。「URL を作り直す」で前の URL を無効にでき、「公開をやめる」で見られなくなります。
- **バックアップ**: 全フライトを JSON ファイルに書き出し、読み込んで復元できます。

## データの保存について

- **ログインしていないとき**: 記録は、使っているブラウザの中（localStorage）にだけ保存します。別のブラウザや端末とは共有されず、ブラウザのサイトデータを消すと記録も消えます。
- **Google でログインしたとき**: 記録はクラウド（Firebase の Firestore）に保存され、同じアカウントでログインした PC・スマホで共有されます。ほかの端末での変更は、開いている画面にもすぐ反映されます。
  - 初めてログインしたとき、そのブラウザにある記録は自動でクラウドに移ります。すでにクラウドに記録がある場合は、両方をまとめます（同じ記録が二重になることはありません）。
  - オフラインのときの変更は端末に保存され、つながったときにクラウドへ送られます。
  - 記録を読み書きできるのは本人だけです（[firestore.rules](firestore.rules)）。
- **共有ページ**: 共有ページ用には路線（出発・到着の空港）だけを別に保存しているので、共有ページから日付や便名が見られることはありません。
- **バックアップ**: 「書き出し」で全フライトを JSON ファイルに保存できます。「読み込み」すると、今の記録はファイルの内容に置き換わります（ログイン中はクラウドの記録も置き換わります）。

## 開発

Node.js 24 以降が必要です。

```bash
npm install
npm run dev        # 開発サーバー（http://localhost:5173/）
npm run build      # 型チェック + 本番ビルド（dist/）
npm run preview    # 本番ビルドの確認（http://localhost:4173/my-flight-log/）
```

### ファイル構成

```
src/
  App.tsx                    自分の画面と共有ページ（?share=ID）の切り替え
  components/
    GlobeView.tsx            地球儀（路線・空港の点・ラベル、ラベルの重なり回避、カメラ移動）
    FlightForm.tsx           フライトの追加・編集フォーム
    DateInput.tsx            年だけ・年月だけでも入力できる日付欄
    FlightList.tsx           フライト一覧（編集・削除、押すと地図で強調）
    AirportInput.tsx         空港の検索入力
    BackupControls.tsx       バックアップの書き出し・読み込み
    AccountControls.tsx      Google ログインと同期状態の表示
    ShareControls.tsx        共有ページの作成・URL の作り直し・公開停止
    SharedView.tsx           共有ページ（?share=ID で開いたときの閲覧専用画面）
    FlightLogView.tsx        地球儀とパネルの画面全体（自分の画面と共有ページで共通）
  airports.ts                空港の検索、距離・中間地点の計算、国内線/国際線の判定
  storage.ts                 localStorage への保存と、バックアップファイルの形式・検証
  useFlights.ts              保存先の切り替え（未ログインはブラウザ、ログイン中はクラウド）と初回の引っ越し
  cloud.ts, firebase.ts      Firestore への読み書きと、Firebase の設定
  types.ts                   Flight・Airport の型
  data/airports.json         空港データ（scripts/build-airports.mjs で生成）
public/
  land.webp, night-sky.webp  地図画像・星空画像（scripts/build-textures.mjs で生成）
scripts/                     空港データ・画像の生成スクリプト
```

### 空港データの更新

空港データ（[src/data/airports.json](src/data/airports.json)）は、OurAirports の公開データから作っています。最新の内容に更新するときは次を実行します。

```bash
npm run build:airports
```

IATA コードがあり、定期便が飛んでいる空港だけを取り出します（[scripts/build-airports.mjs](scripts/build-airports.mjs)）。

### 地図画像の更新

地球に貼る地図画像（`public/land.webp`）と背景の星空画像（`public/night-sky.webp`）は、事前に生成したものです。ブラウザで毎回描くと最初の表示が遅くなるため、画像にしています。陸地や国境線の色を変えるときは、[scripts/build-textures.mjs](scripts/build-textures.mjs) を編集してから次を実行します。

```bash
npm run build:textures
```

### 公開（GitHub Pages）

`main` ブランチにプッシュすると、GitHub Actions（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）が自動でビルドし、GitHub Pages に公開します。

公開版は `/my-flight-log/` の下で配信されるため、[vite.config.ts](vite.config.ts) では、ビルドとプレビューのときだけ `base` を `/my-flight-log/` にしています。`public/` 内のファイルを参照するときは、`/xxx.png` のような絶対パスにせず、`import.meta.env.BASE_URL` を前に付けてください。

### Firebase の設定

ログイン・同期・共有ページには Firebase を使っています（無料の Spark プランのまま使っており、有料プランが必要な機能は使いません）。Firebase コンソールでの設定は次のとおりです。

| 項目 | 設定 |
|---|---|
| Authentication | ログイン方法で「Google」を有効化。承認済みドメインに `timmy-0123bot.github.io` を追加（`localhost` は最初から入っています） |
| Firestore Database | ロケーション `asia-northeast1`（東京）、本番環境モード |
| Firestore のルール | [firestore.rules](firestore.rules) の内容 |

- **ルールを変えるとき**: [firestore.rules](firestore.rules) を編集したら、Firebase コンソールの「Firestore Database」→「ルール」に内容を貼り付けて「公開」してください。ファイルを変えてプッシュしただけでは反映されません。
- **データの置き場所**:
  - `users/{uid}`: 本人の全フライトと、共有ページの ID
  - `shares/{shareId}`: 共有ページ用の路線（出発・到着の空港）だけ
- **API キーについて**: [src/firebase.ts](src/firebase.ts) にある Firebase のウェブ用設定は、ブラウザに配信する前提の公開情報です。GitHub の Secret scanning が「Google API Key」として警告しますが、秘密の鍵ではありません。データはルールで保護しています。
  - そのうえで念のため、Google Cloud コンソールの「認証情報」でこのキーにウェブサイト制限をかけ、使えるサイトを公開版・`my-flight-log-14f7e.firebaseapp.com`（ログイン画面）・`localhost:5173`・`localhost:4173` に絞っています。
  - 公開先を増やすときは、このウェブサイト制限と、Authentication の承認済みドメインの両方に追加してください。

## 使用技術

- アプリ本体
  - [React](https://react.dev/) + TypeScript + [Vite](https://vite.dev/)
  - [react-globe.gl](https://github.com/vasturiano/react-globe.gl)（[three.js](https://threejs.org/) を使った地球儀の描画）
  - [Firebase](https://firebase.google.com/)（Authentication で Google ログイン、Firestore で記録の保存。無料の Spark プランで使用）
- 地図画像の生成（`npm run build:textures` のときだけ使用）
  - [d3-geo](https://github.com/d3/d3-geo)、[topojson-client](https://github.com/topojson/topojson-client)、[@napi-rs/canvas](https://github.com/Brooooooklyn/canvas)

## データ・素材の出典

- 空港データ: [OurAirports](https://ourairports.com/data/)（パブリックドメイン）
- 国境データ: [Natural Earth](https://www.naturalearthdata.com/)（パブリックドメイン）。[world-atlas](https://github.com/topojson/world-atlas)（ISC License）の 1:50m 版を利用しています。
- 星空の背景画像: [three-globe](https://github.com/vasturiano/three-globe) のサンプル画像（MIT License）。元の画像は `scripts/assets/night-sky.png` にあります。
