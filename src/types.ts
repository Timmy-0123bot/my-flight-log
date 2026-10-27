export type Airport = {
  iata: string
  name: string
  city: string
  country: string
  lat: number
  lng: number
}

export type Flight = {
  id: string
  from: string // IATAコード
  to: string // IATAコード
  // 任意。年だけ・年月だけも可（YYYY / YYYY-MM / YYYY-MM-DD）。文字列のまま並べ替えられる
  date?: string
  flightNumber?: string
  airline?: string
}
