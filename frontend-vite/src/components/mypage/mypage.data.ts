import { type AssetSummaryData } from './mypage.types'

// 1. 자산 요약 데이터
export const mockAssetSummary: AssetSummaryData = {
  totalAssets: 10485000,
  cash: 3245000,
  stockValue: 7240000,
  totalProfit: 485000,
  totalProfitRate: 4.85,
  initialAssets: 10000000,
}

// 2. 자산 변화 추이 (차트용)
// export const mockAssetHistory: AssetHistoryData[] = [
//   { month: '1월', value: 8000000 },
//   { month: '2월', value: 8500000 },
//   { month: '3월', value: 8200000 },
//   { month: '4월', value: 9000000 },
//   { month: '5월', value: 8800000 },
//   { month: '6월', value: 9500000 },
//   { month: '7월', value: 9200000 },
//   { month: '8월', value: 10000000 },
//   { month: '9월', value: 10500000 },
//   { month: '10월', value: 10200000 },
//   { month: '11월', value: 11000000 },
//   { month: '12월', value: 11000000 },
// ]

// 3. 보유 주식 데이터
// export const mockStockHoldings: StockHolding[] = [
//   {
//     name: '삼성전자',
//     code: '005930',
//     quantity: 50,
//     purchasePrice: 65000,
//     currentPrice: 68500,
//   },
//   {
//     name: 'LG전자',
//     code: '066570',
//     quantity: 30,
//     purchasePrice: 92000,
//     currentPrice: 97400,
//   },
//   {
//     name: 'NAVER',
//     code: '035420',
//     quantity: 5,
//     purchasePrice: 185000,
//     currentPrice: 178600,
//   },
// ]

// // 4. 거래 내역 데이터
// export const mockTransactionHistory: Transaction[] = [
//   {
//     date: '2025.10.21 10:43',
//     type: '매수',
//     name: '삼성전자',
//     code: '005930',
//     quantity: 10,
//     price: 68200,
//     amount: 682000,
//   },
//   {
//     date: '2025.10.20 14:25',
//     type: '매도',
//     name: '카카오',
//     code: '035720',
//     quantity: 20,
//     price: 45500,
//     amount: 910000,
//   },
//   {
//     date: '2025.10.19 11:30',
//     type: '매수',
//     name: 'LG전자',
//     code: '066570',
//     quantity: 30,
//     price: 92000,
//     amount: 2760000,
//   },
//   {
//     date: '2025.10.18 15:10',
//     type: '매수',
//     name: 'NAVER',
//     code: '035420',
//     quantity: 5,
//     price: 185000,
//     amount: 925000,
//   },
// ]

// 5. 개인정보 데이터
// export const mockUserInfo: UserInfo = {
//   name: '김투자',
//   email: 'investor@example.com',
//   phone: '010-1234-5678',
//   joinedDate: '2025.09.15',
// }
