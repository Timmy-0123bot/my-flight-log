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
  date?: string // YYYY-MM-DD（任意）
  flightNumber?: string
  airline?: string
}
