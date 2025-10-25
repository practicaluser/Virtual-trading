export interface AssetSummaryData {
  totalAssets: number
  cash: number
  stockValue: number
  totalProfit: number
  totalProfitRate: number
  initialAssets: number
}

export interface AssetHistoryData {
  month: string
  value: string // ✨ number -> string (API 응답 일치)
}

// --- 1. Portfolio API 응답에 맞는 타입 ---
interface StockInfo {
  stock_code: string
  stock_name: string
}

export interface PortfolioItem {
  stock: StockInfo
  total_quantity: number
  average_purchase_price: string
  current_price: number // ✨ 이 필드는 이제 HoldingRow에서 계산되므로 제거해도 무방하나, 일단 유지
  total_value: number // ✨ 이 필드는 이제 HoldingRow에서 계산되므로 제거해도 무방하나, 일단 유지
  profit_loss: number // ✨ 이 필드는 이제 HoldingRow에서 계산되므로 제거해도 무방하나, 일단 유지
  profit_loss_rate: number // ✨ 이 필드는 이제 HoldingRow에서 계산되므로 제거해도 무방하나, 일단 유지

  // ✨ [추가] 실시간 데이터를 담을 옵셔널 필드
  realTimeData?: StockRealTimeData | null
}

// --- 2. Orders API 응답에 맞는 타입 ---
// (API 명세에 따라 필드를 정확히 맞춰야 합니다)
export interface TransactionOrderItem {
  id: number
  stock: StockInfo
  order_type: 'BUY' | 'SELL'
  quantity: number
  status: string // PENDING, COMPLETED, CANCELED 등
  timestamp: string // 주문 생성 또는 최종 변경 시간

  price_type: 'LIMIT' | 'MARKET' // 주문 유형 추가
  price: string | null // 시장가 주문 시 사용될 수 있는 가격 필드 (Nullable)
  limit_price: string | null // 지정가 주문 가격 (Nullable)
  executed_price: string | number | null // ✨ 체결 가격 (string, number, null 모두 가능)
  transaction_timestamp?: string | null // 체결 시각 (Nullable)
  total_amount?: number | null // 총 거래 금액 (Nullable)
}

// export interface StockHolding {
//   name: string
//   code: string
//   quantity: number
//   purchasePrice: number
//   currentPrice: number
// }

// export interface Transaction {
//   date: string
//   type: '매수' | '매도'
//   name: string
//   code: string
//   quantity: number
//   price: number
//   amount: number
// }

export interface UserInfo {
  nickname: string // 'name' -> 'nickname'
  email: string
  // 'phone'은 API 응답에 없으므로 제거 (필요시 추가)
  date_joined: string // 'joinedDate' -> 'date_joined'
}

// [추가] /api/stocks/detail/${stockCode}/ 응답 타입
// (필요한 'price' 필드만 정의)
export interface StockRealTimeData {
  price: string // 예: "98,500"
  // ... (API가 반환하는 다른 필드들, 예: change, change_rate 등)
}

export interface StockCalculations {
  totalStockValue: number // 총 주식 평가액
  totalStockProfit: number // 총 주식 손익
  totalStockProfitRate: number // 총 주식 수익률
}
