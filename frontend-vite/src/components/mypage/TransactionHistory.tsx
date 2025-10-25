import React, { useState, useMemo, useEffect } from 'react'
import { type TransactionOrderItem } from './mypage.types'
import { formatCurrency } from './format'

type TransactionFilterType = '전체' | '매수' | '매도'

interface TransactionHistoryProps {
  data: TransactionOrderItem[]
}

// 날짜 포맷 함수 (export 확인)
export const formatSafeDate = (
  dateString: string | null | undefined,
): string => {
  if (!dateString) return '날짜 정보 없음'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return 'Invalid Date'
  }
  return date.toLocaleString('ko-KR') // 한국 시간 형식
}

// 가격 파싱 및 포맷 헬퍼 함수
const parseAndFormatPrice = (
  price: string | number | null | undefined,
): string => {
  let numericPrice = NaN
  if (typeof price === 'number') {
    numericPrice = price
  } else if (typeof price === 'string') {
    numericPrice = parseFloat(price)
  }
  return formatCurrency(numericPrice)
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  data,
}) => {
  // 로그 useEffect (유지 또는 필요시 제거)
  useEffect(() => {
    console.log('--- TransactionHistory Component Data Check ---')
    console.log('MyPage로부터 받은 전체 데이터 (data prop):', data)
    if (data && data.length > 0) {
      console.log('첫 번째 거래 내역 항목의 상세 구조:', data[0])
    }
  }, [data])

  const [activeTab, setActiveTab] = useState<TransactionFilterType>('전체')

  // 필터링된 데이터 (useMemo 사용)
  const filteredData = useMemo((): TransactionOrderItem[] => {
    if (!data) return []

    // ✨ 1. 먼저 status가 'COMPLETED'인 것만 필터링
    const completedOrders = data.filter(
      (item: TransactionOrderItem) => item.status === 'COMPLETED',
    )

    // 2. 그 다음 activeTab (전체/매수/매도)에 따라 필터링
    if (activeTab === '전체') return completedOrders
    const typeToFilter = activeTab === '매수' ? 'BUY' : 'SELL'
    return completedOrders.filter(
      (item: TransactionOrderItem) => item.order_type === typeToFilter,
    )
  }, [activeTab, data]) // data가 변경될 때마다 재계산

  // 탭 버튼 컴포넌트
  const TabButton = ({ type }: { type: TransactionFilterType }) => (
    <button
      onClick={() => setActiveTab(type)}
      className={`px-4 py-2 font-semibold transition-colors ${
        activeTab === type
          ? 'text-indigo-600 border-b-2 border-indigo-600'
          : 'text-gray-500 hover:text-indigo-600'
      }`}
    >
      {type}
    </button>
  )

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        거래 내역 (체결 완료)
      </h3>{' '}
      {/* ✨ 제목 수정 */}
      <div className="flex border-b mb-4">
        <TabButton type="전체" />
        <TabButton type="매수" />
        <TabButton type="매도" />
      </div>
      {/* ✨ 3. 데이터 없을 때 메시지 추가 */}
      {filteredData.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          체결된 거래 내역이 없습니다.
        </p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-gray-500 text-sm">
              <th className="py-3">거래일시</th>
              <th className="py-3">구분</th>
              <th className="py-3">종목명</th>
              <th className="py-3 text-right">수량</th>
              <th className="py-3 text-right">체결가</th>
              <th className="py-3 text-right">거래금액</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item: TransactionOrderItem) => {
              const transactionType =
                item.order_type === 'BUY' ? '매수' : '매도'

              let priceNum = NaN
              if (typeof item.executed_price === 'number') {
                priceNum = item.executed_price
              } else if (typeof item.executed_price === 'string') {
                priceNum = parseFloat(item.executed_price)
              }

              const amount = !isNaN(priceNum) ? item.quantity * priceNum : NaN

              return (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 text-sm text-gray-600">
                    {/* ✨ 체결 시각이 있다면 표시, 없다면 주문 시각 표시 */}
                    {formatSafeDate(
                      item.transaction_timestamp ?? item.timestamp,
                    )}
                  </td>
                  <td className="py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        transactionType === '매수'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {transactionType}
                    </span>
                  </td>
                  <td className="py-4">
                    <p className="font-semibold text-gray-800">
                      {item.stock.stock_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.stock.stock_code}
                    </p>
                  </td>
                  <td className="py-4 text-right">{item.quantity}주</td>
                  <td className="py-4 text-right">
                    {parseAndFormatPrice(item.executed_price)}
                  </td>
                  <td className="py-4 text-right">{formatCurrency(amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
