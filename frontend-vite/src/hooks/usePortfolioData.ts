import { useState, useEffect, useMemo } from 'react'
import { isAxiosError } from 'axios'
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
  pendingOrders: TransactionOrderItem[]
  historicalAssetHistory: AssetHistoryData[]
  stockCalcs: StockCalculations
  totalAssets: number
  initialAssets: number
  cancelOrder: (orderId: number) => Promise<void>
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

  // 무한 루프 방지 플래그
  const [isRealTimeDataLoaded, setIsRealTimeDataLoaded] = useState(false)

  // "신호등" 플래그 (정적 데이터 로드 완료)
  const [isStaticDataLoaded, setIsStaticDataLoaded] = useState(false)

  const { cashBalance } = useAuth()

  // 마운트 시 정적 데이터 로드
  useEffect(() => {
    let isMounted = true

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

          // 실시간 데이터 다시 로드하도록 플래그 리셋
          setIsRealTimeDataLoaded(false)

          // "신호등" 켜기
          setIsStaticDataLoaded(true)
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
          setError(message)
          // 에러가 나도 다음 단계로 넘어가야 함
          setIsStaticDataLoaded(true)
        }
      }
    }
    fetchStaticData()

    return () => {
      isMounted = false
    }
  }, [])

  // 실시간 데이터 로드 및 계산
  useEffect(() => {
    if (!isStaticDataLoaded) return

    if (stockHoldings.length === 0) {
      setIsLoading(false)
      setStockCalcs({
        totalStockValue: 0,
        totalStockProfit: 0,
        totalStockProfitRate: 0,
      })
      return
    }

    if (isRealTimeDataLoaded) {
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

        setStockHoldings(enrichedHoldings)
        setStockCalcs({
          totalStockValue,
          totalStockProfit,
          totalStockProfitRate,
        })
        setError(null)

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
          setStockCalcs({
            totalStockValue: 0,
            totalStockProfit: 0,
            totalStockProfitRate: 0,
          })
          setIsRealTimeDataLoaded(true)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchAllRealTimeData()
    return () => {
      isMounted = false
    }
  }, [isStaticDataLoaded, stockHoldings, isRealTimeDataLoaded])

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

  const totalAssets = useMemo((): number => {
    if (isLoading || error) return 0
    return stockCalcs.totalStockValue + cashBalance
  }, [stockCalcs.totalStockValue, cashBalance, isLoading, error])

  const initialAssets = mockAssetSummary.initialAssets

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
