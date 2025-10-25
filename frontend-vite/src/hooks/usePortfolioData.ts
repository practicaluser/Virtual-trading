import { useState, useEffect, useMemo } from 'react'
import { isAxiosError } from 'axios' // 'axios', 'AxiosError' 제거
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../contexts/AuthContext'
import {
  type AssetHistoryData,
  type PortfolioItem,
  type TransactionOrderItem,
  type UserInfo,
  type StockRealTimeData,
  type StockCalculations,
} from '../components/mypage/mypage.types'
import { mockAssetSummary } from '../components/mypage/mypage.data'

// 실시간 데이터 포함된 포트폴리오 아이템 타입
interface EnrichedPortfolioItem extends PortfolioItem {
  realTimeData?: StockRealTimeData | null
}

// 훅 반환 타입
export interface PortfolioData {
  isLoading: boolean
  error: string | null
  userInfo: UserInfo | null
  cashBalance: number
  stockHoldings: EnrichedPortfolioItem[]
  transactionHistory: TransactionOrderItem[]
  pendingOrders: TransactionOrderItem[] // ✨ 미체결 주문 목록
  historicalAssetHistory: AssetHistoryData[]
  stockCalcs: StockCalculations
  totalAssets: number
  initialAssets: number
  cancelOrder: (orderId: number) => Promise<void> // ✨ 주문 취소 함수
}

// 파싱 함수
const parsePrice = (priceStr: string | number): number => {
  if (typeof priceStr === 'number') return priceStr
  return parseFloat(String(priceStr).replace(/,/g, '')) || 0
}

// --- usePortfolioData 훅 ---
export const usePortfolioData = (): PortfolioData => {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [stockHoldings, setStockHoldings] = useState<EnrichedPortfolioItem[]>(
    [],
  )
  const [transactionHistory, setTransactionHistory] = useState<
    TransactionOrderItem[]
  >([])

  const [pendingOrders, setPendingOrders] = useState<TransactionOrderItem[]>([])

  const [historicalAssetHistory, setHistoricalAssetHistory] = useState<
    AssetHistoryData[]
  >([])
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [stockCalcs, setStockCalcs] = useState<StockCalculations>({
    totalStockValue: 0,
    totalStockProfit: 0,
    totalStockProfitRate: 0,
  })
  const [isCanceling, setIsCanceling] = useState(false)

  // ✨ [수정] 무한 루프 방지를 위한 실시간 데이터 로드 완료 플래그
  const [isRealTimeDataLoaded, setIsRealTimeDataLoaded] = useState(false)

  const { cashBalance } = useAuth()

  // 마운트 시 정적 데이터 로드
  useEffect(() => {
    let isMounted = true // ✨ 클린업 함수용 플래그 (let으로 변경)

    const fetchStaticData = async () => {
      try {
        if (isMounted) setIsLoading(true)

        const [portfolioRes, ordersRes, userRes, historyRes, pendingOrdersRes] =
          await Promise.all([
            axiosInstance.get<PortfolioItem[]>('/api/trading/portfolio/'),
            axiosInstance.get<TransactionOrderItem[]>('/api/trading/orders/'),
            axiosInstance.get<UserInfo>('/api/users/mypage/'),
            axiosInstance.get<AssetHistoryData[]>('/api/users/asset-history/'),
            axiosInstance.get<TransactionOrderItem[]>(
              '/api/trading/orders/pending/',
            ),
          ])

        if (isMounted) {
          setStockHoldings(
            portfolioRes.data.map((item) => ({ ...item, realTimeData: null })),
          )
          setTransactionHistory(ordersRes.data)
          setUserInfo(userRes.data)
          setHistoricalAssetHistory(historyRes.data)
          setPendingOrders(pendingOrdersRes.data)
          setError(null)

          // ✨ [수정] 정적 데이터 로드 완료 시, 실시간 데이터 다시 로드하도록 플래그 리셋
          setIsRealTimeDataLoaded(false)
        }
      } catch (err: unknown) {
        console.error('Data loading failed:', err)
        let message = '데이터를 불러오는 데 실패했습니다.'
        if (err instanceof Error) {
          message = `데이터 로딩 실패: ${err.message}`
        } else if (typeof err === 'string') {
          message = err
        }

        if (isMounted) {
          // ✨ unmount 체크 추가
          setError(message)
        }
      } finally {
        // ✨ [수정] 첫 번째 useEffect에서는 로딩 상태를 내리지 않습니다.
        // 실시간 데이터 로드(두 번째 useEffect) 완료 후 finally에서 내립니다.
        // if (isMounted) setIsLoading(false) // 이 라인 제거
      }
    }
    fetchStaticData()

    // ✨ 클린업 함수 추가
    return () => {
      isMounted = false
    }
  }, []) // 마운트 시 1회

  // 실시간 데이터 로드 및 계산
  useEffect(() => {
    // stockHoldings가 비어있으면 (보유 주식 없음)
    if (stockHoldings.length === 0) {
      // ✨ [수정] 불필요한 라인 제거 (종속성 경고 해결)
      // if (!isLoading) setIsLoading(false)

      // 보유 주식이 없으므로 로딩 완료 처리
      setIsLoading(false)

      // 계산값 초기화
      setStockCalcs({
        totalStockValue: 0,
        totalStockProfit: 0,
        totalStockProfitRate: 0,
      })
      return
    }

    // ✨ [수정] 이미 실시간 데이터가 로드되었다면 무한 루프 방지
    if (isRealTimeDataLoaded) {
      // 실시간 데이터 로드가 완료되었으므로, 최종 로딩 상태 false 보장
      setIsLoading(false)
      return
    }

    let isMounted = true

    const fetchAllRealTimeData = async () => {
      try {
        const pricePromises = stockHoldings.map((item) =>
          axiosInstance
            .get<StockRealTimeData>(
              `/api/stocks/detail/${item.stock.stock_code}/`,
            )
            .catch(() => null),
        )
        const responses = await Promise.all(pricePromises)

        if (!isMounted) return

        const realTimeDataList = responses.map((res) => (res ? res.data : null))

        let totalStockValue = 0
        let totalPurchaseCost = 0
        const enrichedHoldings = stockHoldings.map((item, index) => {
          const realTimeData = realTimeDataList[index]
          const enrichedItem = { ...item, realTimeData }

          const quantity = enrichedItem.total_quantity
          const avgPrice = parseFloat(enrichedItem.average_purchase_price) || 0
          const purchaseCost = avgPrice * quantity
          totalPurchaseCost += purchaseCost

          if (realTimeData && realTimeData.price) {
            const currentPrice = parsePrice(realTimeData.price)
            totalStockValue += currentPrice * quantity
          } else {
            totalStockValue += purchaseCost
          }
          return enrichedItem
        })

        const totalStockProfit = totalStockValue - totalPurchaseCost
        const totalStockProfitRate =
          totalPurchaseCost > 0
            ? (totalStockProfit / totalPurchaseCost) * 100
            : 0

        // 상태 업데이트
        setStockHoldings(enrichedHoldings)
        setStockCalcs({
          totalStockValue,
          totalStockProfit,
          totalStockProfitRate,
        })
        setError(null)

        // ✨ [수정] 실시간 데이터 로드 완료 플래그 설정
        if (isMounted) setIsRealTimeDataLoaded(true)
      } catch (err: unknown) {
        console.error('Failed to fetch real-time stock data:', err)
        let message = '실시간 주가 정보를 가져오는 데 실패했습니다.'
        if (err instanceof Error) {
          message = `실시간 주가 로딩 실패: ${err.message}`
        } else if (typeof err === 'string') {
          message = err
        }

        if (isMounted) {
          setError(message)
          // 계산값 초기화
          setStockCalcs({
            totalStockValue: 0,
            totalStockProfit: 0,
            totalStockProfitRate: 0,
          })
          // ✨ [수정] 에러 발생 시에도 루프 방지를 위해 플래그 설정
          setIsRealTimeDataLoaded(true)
        }
      } finally {
        if (isMounted) setIsLoading(false) // 최종 로딩 완료
      }
    }

    fetchAllRealTimeData()

    return () => {
      isMounted = false
    }
    // ✨ [수정] 종속성에 isRealTimeDataLoaded 추가
  }, [stockHoldings, isRealTimeDataLoaded])

  const cancelOrder = async (orderId: number) => {
    if (isCanceling) return
    setIsCanceling(true)
    try {
      await axiosInstance.post(`/api/trading/orders/${orderId}/cancel/`)
      setPendingOrders((prevOrders) =>
        prevOrders.filter((order) => order.id !== orderId),
      )
      alert('주문이 취소되었습니다.')
    } catch (err: unknown) {
      console.error(`Failed to cancel order ${orderId}:`, err)
      let detail = '주문 취소 중 오류가 발생했습니다.'
      if (isAxiosError(err)) {
        // 'isAxiosError' 사용
        if (
          err.response?.data &&
          typeof err.response.data.detail === 'string'
        ) {
          detail = err.response.data.detail
        } else if (err.message) {
          detail = err.message
        }
      } else if (err instanceof Error) {
        detail = err.message
      }
      alert(detail)
    } finally {
      setIsCanceling(false)
    }
  }

  // 총 자산 계산
  const totalAssets = useMemo((): number => {
    // 로딩 중/에러 시 0 반환 (isLoading만 체크해도 됨)
    if (isLoading || error) return 0
    return stockCalcs.totalStockValue + cashBalance
  }, [stockCalcs.totalStockValue, cashBalance, isLoading, error])

  const initialAssets = mockAssetSummary.initialAssets

  // 훅 반환 값
  return {
    isLoading: isLoading || isCanceling,
    error,
    userInfo,
    cashBalance,
    stockHoldings,
    transactionHistory,
    pendingOrders,
    historicalAssetHistory,
    stockCalcs,
    totalAssets,
    initialAssets,
    cancelOrder,
  }
}
