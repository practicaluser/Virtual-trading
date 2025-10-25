// src/pages/StockDetailPage.tsx

import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
// import axios from 'axios' // 1. axios import

// --- 추가
import axiosInstance from '../api/axiosInstance'
import { createOrder } from '../api/trading'
import { useAuth } from '../contexts/AuthContext'

// 컴포넌트 import
import StockHeader from '../components/stock-detail/StockHeader'
import ChartSection from '../components/stock-detail/ChartSection'
import OrderBook from '../components/stock-detail/OrderBook'
import TimeTicker from '../components/stock-detail/TimeTicker'
import DailyTicker from '../components/stock-detail/DailyTicker'

// --- 추가
import OrderModal from '../components/stock-detail/OrderModal'

// --- 2. API 응답에 맞게 타입 정의 ---
interface StockDetailData {
  name: string
  code: string
  price: string
  change: string
  change_rate: string
  status: string
  charts: {
    day: string
    week: string
    month: string
  }
  order_book_5: any
  order_book_10: any
}

const parsePrice = (priceStr: string): number => {
  return parseInt(priceStr.replace(/,/g, ''), 10) || 0
}

const StockDetailPage: React.FC = () => {
  const { stockCode } = useParams<{ stockCode: string }>()
  const { fetchUserBalance } = useAuth()

  // 3. API 데이터를 저장할 상태
  const [stockData, setStockData] = useState<StockDetailData | null>(null)
  const [timeTicks, setTimeTicks] = useState([]) // API 5
  const [dailyTicks, setDailyTicks] = useState([]) // API 6

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // --- 추가. 모달 및 주문 상태 추가 ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [orderType, setOrderType] = useState<'BUY' | 'SELL' | null>(null)
  const [isOrderLoading, setIsOrderLoading] = useState(false)

  useEffect(() => {
    if (!stockCode) return

    // --- 4. 백엔드 API 호출 로직 ---
    const fetchStockDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        // 3개 API를 동시에 요청
        const [detailRes, ticksRes, dailyRes] = await Promise.all([
          // axios.get(`http://127.0.0.1:8000/api/stocks/detail/${stockCode}/`),
          // axios.get(`http://127.0.0.1:8000/api/stocks/ticks/${stockCode}/1/`),
          // axios.get(`http://127.0.0.1:8000/api/stocks/daily/${stockCode}/1/`),

          axiosInstance.get(`/api/stocks/detail/${stockCode}/`),
          axiosInstance.get(`/api/stocks/ticks/${stockCode}/1/`),
          axiosInstance.get(`/api/stocks/daily/${stockCode}/1/`),
        ])

        setStockData(detailRes.data)
        setTimeTicks(ticksRes.data)
        setDailyTicks(dailyRes.data)
      } catch (err) {
        console.error('Error fetching stock details:', err)
        setError('종목 정보를 불러오는 데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchStockDetails()
  }, [stockCode]) // stockCode가 변경될 때마다 다시 호출

  // ---추가 5. 모달 제어 함수 ---
  const openOrderModal = (type: 'BUY' | 'SELL') => {
    setOrderType(type)
    setIsModalOpen(true)
  }

  const closeOrderModal = () => {
    setIsModalOpen(false)
    setOrderType(null)
  }

  // ---추가 6. 주문 제출 처리 함수 ---
  const handleOrderSubmit = async (
    quantity: number,
    priceType: 'LIMIT' | 'MARKET',
    limitPrice: number,
    modalOrderType: 'BUY' | 'SELL', // 모달 탭에서 결정된 타입
  ) => {
    if (!stockCode) return

    setIsOrderLoading(true)
    try {
      await createOrder({
        stock: stockCode,
        order_type: modalOrderType,
        quantity: quantity,
        price_type: priceType,
        limit_price: priceType === 'LIMIT' ? limitPrice : undefined,
      })

      alert(`${modalOrderType === 'BUY' ? '매수' : '매도'}가 완료되었습니다.`)
      closeOrderModal()
      // (선택) 주문 성공 후 예수금이나 포트폴리오 정보를 새로고침 할 수 있습니다.
      await fetchUserBalance()
    } catch (err: any) {
      // 백엔드에서 보낸 에러 메시지 표시
      if (
        err.response &&
        err.response.status === 400 &&
        err.response.data.detail
      ) {
        alert(err.response.data.detail)
      } else {
        console.error('주문 처리 실패:', err)
        alert('주문 처리 중 오류가 발생했습니다.')
      }
    } finally {
      setIsOrderLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center mt-20">데이터를 불러오는 중...</div>
  }

  if (error || !stockData) {
    return (
      <div className="text-center mt-20 text-red-500">
        {error || '종목 정보를 불러올 수 없습니다.'}
      </div>
    )
  }

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24 pb-12 space-y-6">
      {/* 5. 각 컴포넌트에 실제 데이터 전달 */}
      {/* 7. StockHeader에 모달 제어 함수 전달 */}
      <StockHeader
        name={stockData.name}
        code={stockData.code}
        price={stockData.price}
        changeValue={stockData.change}
        changeRate={stockData.change_rate}
        isPositive={stockData.status === '상승'}
        onBuyClick={() => openOrderModal('BUY')}
        onSellClick={() => openOrderModal('SELL')}
      />

      {/* 6. ChartSection에 charts 객체 전달 */}
      <ChartSection charts={stockData.charts} />

      {/* (추후 작업) 다른 컴포넌트에도 데이터 전달 */}
      <OrderBook
        orderBook5={stockData.order_book_5}
        orderBook10={stockData.order_book_10}
      />
      <TimeTicker ticks={timeTicks} stockCode={stockCode!} />
      <DailyTicker ticks={dailyTicks} stockCode={stockCode!} />

      {/* 8. 모달 렌더링 */}
      {/* 모달이 DOM에는 존재하지만, 
    내부 로직에 의해 isOpen이 false일 때는 null을 반환하여 보이지 않습니다. 
*/}
      <OrderModal
        isOpen={isModalOpen}
        onClose={closeOrderModal}
        onSubmit={handleOrderSubmit}
        initialOrderType={orderType!}
        stockName={stockData.name}
        isLoading={isOrderLoading}
        currentPrice={parsePrice(stockData.price)} // 현재가 전달
      />
    </main>
  )
}

export default StockDetailPage
