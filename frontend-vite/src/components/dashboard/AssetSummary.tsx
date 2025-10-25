import React from 'react'
import { formatCurrency } from '../mypage/format' // 포맷 유틸 임포트

// Props 타입 정의
interface AssetSummaryProps {
  totalValue: number
  totalReturnRate: number
  cash: number
}

const AssetSummary: React.FC<AssetSummaryProps> = ({
  totalValue,
  totalReturnRate,
  cash,
}) => {
  const isPositive = totalReturnRate >= 0

  return (
    <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">총 자산 현황</h3>
      <div className="space-y-3">
        <div>
          <p className="text-gray-500">총 평가금액</p>
          {/* 실제 데이터 + 포맷팅 */}
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
        <div>
          <p className="text-gray-500">총 수익률</p>
          {/* 실제 데이터 + 포맷팅 + 조건부 스타일 */}
          <p
            className={`text-xl font-bold ${
              isPositive ? 'text-red-500' : 'text-blue-500'
            }`}
          >
            {isPositive && '+'}
            {totalReturnRate.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-gray-500">보유 현금</p>
          {/* 실제 데이터 + 포맷팅 */}
          <p className="text-xl font-bold">{formatCurrency(cash)}</p>
        </div>
      </div>
    </div>
  )
}

export default AssetSummary
