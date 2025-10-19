// src/components/stock-detail/DailyTicker.tsx

import React, { useState, useEffect } from 'react'
import axios from 'axios'

// API 6 데이터 구조 정의
interface DailyTick {
  date: string
  close: string
  change: string
  change_status: string // "상승" or "하락"
  open: string
  high: string
  low: string
  volume: string
}

interface DailyTickerProps {
  ticks: DailyTick[] // StockDetailPage에서 받은 1페이지 데이터
  stockCode: string
}

// 테이블 행(Row) 컴포넌트
const DailyTickerRow: React.FC<{ data: DailyTick }> = ({ data }) => {
  const isUp = data.change_status === '상승'
  const textColor = isUp ? 'text-red-500' : 'text-blue-500'
  const changeIcon = isUp ? '▲' : '▼'
  const changeValue = data.change.replace(/,/g, '')

  return (
    <tr className="border-b border-gray-200 text-sm text-center">
      <td className="py-2 px-2">{data.date}</td>
      <td className={`py-2 px-2 font-semibold ${textColor}`}>{data.close}</td>
      <td className={`py-2 px-2 ${textColor}`}>
        {changeValue !== '0' && changeIcon}{' '}
        {changeValue === '0' ? '0' : data.change}
      </td>
      <td className="py-2 px-2 text-right">{data.open}</td>
      <td className="py-2 px-2 text-right text-red-600">{data.high}</td>
      <td className="py-2 px-2 text-right text-blue-600">{data.low}</td>
      <td className="py-2 px-2 text-right">{data.volume}</td>
    </tr>
  )
}

// 메인 컴포넌트
const DailyTicker: React.FC<DailyTickerProps> = ({ ticks, stockCode }) => {
  const [currentTicks, setCurrentTicks] = useState<DailyTick[]>(ticks)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 부모 컴포넌트에서 stockCode가 변경되면 1페이지 데이터로 리셋
  useEffect(() => {
    setCurrentTicks(ticks)
    setCurrentPage(1)
    setError(null)
  }, [ticks])

  // 페이지 이동 함수
  const fetchPage = async (page: number) => {
    if (page < 1) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/api/stocks/daily/${stockCode}/${page}/`,
      )
      if (response.data.length > 0) {
        setCurrentTicks(response.data)
        setCurrentPage(page)
      } else {
        // 마지막 페이지 블록에서 '다음'을 눌렀을 때
        setError('마지막 페이지입니다.')
      }
    } catch (err) {
      setError('데이터를 불러오는 데 실패했습니다.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // 페이지네이션 숫자 목록 생성 (예: [1, 2, ... 10])
  const startPage = Math.floor((currentPage - 1) / 10) * 10 + 1
  const pageNumbers = Array.from({ length: 10 }, (_, i) => startPage + i)

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">일별 시세</h2>
      <table className="w-full">
        <thead className="bg-gray-50 border-b-2 border-gray-200">
          <tr className="text-sm font-semibold text-gray-600">
            <th className="py-2 px-2">날짜</th>
            <th className="py-2 px-2">종가</th>
            <th className="py-2 px-2">전일비</th>
            <th className="py-2 px-2">시가</th>
            <th className="py-2 px-2">고가</th>
            <th className="py-2 px-2">저가</th>
            <th className="py-2 px-2">거래량</th>
          </tr>
        </thead>
        <tbody>
          {currentTicks.map((data, idx) => (
            <DailyTickerRow key={idx} data={data} />
          ))}
        </tbody>
      </table>

      {/* 페이지네이션 컨트롤 (숫자 목록 스타일) */}
      <div className="flex justify-center items-center space-x-2 mt-6">
        <button
          onClick={() => fetchPage(startPage - 10)}
          disabled={startPage === 1 || isLoading}
          className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          이전
        </button>
        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => fetchPage(page)}
            disabled={isLoading}
            className={`px-3 py-1 text-sm ${
              currentPage === page
                ? 'font-bold text-red-500'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => fetchPage(startPage + 10)}
          disabled={isLoading}
          className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          다음
        </button>
      </div>
      {isLoading && (
        <p className="text-center text-sm text-gray-500 mt-2">로딩 중...</p>
      )}
      {error && (
        <p className="text-center text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  )
}

export default DailyTicker
