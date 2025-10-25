import React from 'react'
import { type TransactionOrderItem } from './mypage.types' // 기존 주문 타입 재사용
import { formatCurrency } from './format'
import { formatSafeDate } from './TransactionHistory' // 날짜 포맷 함수 재사용

interface PendingOrdersTableProps {
  orders: TransactionOrderItem[] // 미체결 주문 데이터
  onCancelOrder: (orderId: number) => Promise<void> // 주문 취소 함수
  isLoading: boolean // 취소 처리 중 로딩 상태
}

const getOrderPriceString = (order: TransactionOrderItem): string => {
  // 지정가 주문이면 limit_price 사용, 아니면 price 사용 (둘 다 없으면 0)
  const priceValue = order.limit_price ?? order.price ?? '0'
  return formatCurrency(parseFloat(priceValue) || 0)
}

export const PendingOrdersTable: React.FC<PendingOrdersTableProps> = ({
  orders,
  onCancelOrder,
  isLoading,
}) => {
  // 특정 주문 취소 핸들러
  const handleCancelClick = (orderId: number) => {
    if (isLoading) return // 중복 클릭 방지
    // 사용자 확인 (선택 사항)
    if (window.confirm('정말로 이 주문을 취소하시겠습니까?')) {
      onCancelOrder(orderId)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">미체결 주문</h3>
      {orders.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          미체결된 주문이 없습니다.
        </p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-gray-500 text-sm">
              <th className="py-3">주문일시</th>
              <th className="py-3">구분</th>
              <th className="py-3">종목명</th>
              <th className="py-3 text-right">주문수량</th>
              <th className="py-3 text-right">주문가격</th>
              <th className="py-3 text-center">취소</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const orderType = order.order_type === 'BUY' ? '매수' : '매도'
              // 지정가 주문 가격 또는 시장가 표시 (API 응답에 따라 price 필드 확인 필요)
              // API 명세 상 Order 객체에 price 필드가 있으므로 사용
              const orderPriceDisplay = getOrderPriceString(order) // 'orderPriceDisplay' 선언됨

              return (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 text-sm text-gray-600">
                    {formatSafeDate(order.timestamp)}
                  </td>
                  <td className="py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        orderType === '매수'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {orderType}
                    </span>
                  </td>
                  <td className="py-4">
                    <p className="font-semibold text-gray-800">
                      {order.stock.stock_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.stock.stock_code}
                    </p>
                  </td>
                  <td className="py-4 text-right">{order.quantity}주</td>
                  {/* --- [수정] --- */}
                  <td className="py-4 text-right">{orderPriceDisplay}</td>
                  {/* 'orderPrice' -> 'orderPriceDisplay'로 변경 */}
                  {/* --- [수정 완료] --- */}
                  <td className="py-4 text-center">
                    <button
                      onClick={() => handleCancelClick(order.id)}
                      disabled={isLoading} // 로딩 중 비활성화
                      className={`px-3 py-1 text-xs font-semibold rounded ${
                        isLoading
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      }`}
                    >
                      취소
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
