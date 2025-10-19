// src/pages/StockDetailPage.tsx

import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios' // 1. axios import

// 컴포넌트 import
import StockHeader from '../components/stock-detail/StockHeader'
import ChartSection from '../components/stock-detail/ChartSection'
import OrderBook from '../components/stock-detail/OrderBook'
import TimeTicker from '../components/stock-detail/TimeTicker'
import DailyTicker from '../components/stock-detail/DailyTicker'

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

const StockDetailPage: React.FC = () => {
  const { stockCode } = useParams<{ stockCode: string }>()

  // 3. API 데이터를 저장할 상태
  const [stockData, setStockData] = useState<StockDetailData | null>(null)
  const [timeTicks, setTimeTicks] = useState([]) // API 5
  const [dailyTicks, setDailyTicks] = useState([]) // API 6

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!stockCode) return

    // --- 4. 백엔드 API 호출 로직 ---
    const fetchStockDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        // 3개 API를 동시에 요청
        const [detailRes, ticksRes, dailyRes] = await Promise.all([
          axios.get(`http://127.0.0.1:8000/api/stocks/detail/${stockCode}/`),
          axios.get(`http://127.0.0.1:8000/api/stocks/ticks/${stockCode}/1/`),
          axios.get(`http://127.0.0.1:8000/api/stocks/daily/${stockCode}/1/`),
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
      <StockHeader
        name={stockData.name}
        code={stockData.code}
        price={stockData.price}
        changeValue={stockData.change}
        changeRate={stockData.change_rate}
        isPositive={stockData.status === '상승'}
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
    </main>
  )
}

export default StockDetailPage
