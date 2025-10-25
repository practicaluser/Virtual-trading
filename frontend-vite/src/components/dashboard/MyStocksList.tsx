import React from 'react'
import { formatCurrency } from '../mypage/format' // 포맷 유틸 임포트
// EnrichedPortfolioItem 타입 또는 유사한 타입 정의 필요
// 여기서는 간단히 필요한 필드만 포함하는 타입을 정의합니다.
interface StockListItem {
  stock: {
    stock_code: string
    stock_name: string
  }
  currentValue: number // 계산된 평가금액
  changeAmount: number // 계산된 변화량
  isPositiveChange: boolean // 계산된 +/- 여부
  realTimeData?: { price: string } | null // 실시간 가격 표시용
}

// Props 타입 정의
interface MyStocksListProps {
  stocks: StockListItem[]
}

const MyStocksList: React.FC<MyStocksListProps> = ({ stocks }) => {
  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">보유 종목 TOP 5</h3>
      {stocks.length === 0 ? (
        <p className="text-gray-500">보유 중인 종목이 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {stocks.map((stock, index) => (
            <li
              key={stock.stock.stock_code}
              className="flex justify-between items-center"
            >
              <span className="font-semibold">{`${index + 1}. ${
                stock.stock.stock_name
              }`}</span>
              <div>
                {/* 실시간 가격 표시 */}
                <span className="font-bold">
                  {stock.realTimeData?.price
                    ? `${stock.realTimeData.price}원`
                    : '- 원'}
                </span>
                {/* 변화량 표시 */}
                <span
                  className={`ml-2 text-sm ${
                    stock.isPositiveChange ? 'text-red-500' : 'text-blue-500'
                  }`}
                >
                  {stock.isPositiveChange ? '▲' : '▼'}{' '}
                  {Math.abs(stock.changeAmount).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default MyStocksList
