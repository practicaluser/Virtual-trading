import React from 'react'
import {
  ChartBarIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline'
import { type AssetSummaryData } from './mypage.types'
import { formatCurrency } from './format'
import { ProfitText } from './ProfitText'

// --- [수정] Props 타입 확장 ---
interface AssetSummaryProps {
  data: AssetSummaryData
  stockProfit: number // ✨ 주식 손익 prop 추가
  stockProfitRate: number // ✨ 주식 수익률 prop 추가
}

export const AssetSummary: React.FC<AssetSummaryProps> = ({
  data,
  stockProfit, // ✨ props 받기
  stockProfitRate, // ✨ props 받기
}) => (
  <>
    {/* 총 자산 카드 (전체 손익/수익률 표시) */}
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center text-gray-500">
        <CreditCardIcon className="w-5 h-5 mr-2" />
        <span>총 자산</span>
      </div>
      <p className="text-3xl font-bold mt-2">
        {formatCurrency(data.totalAssets)}
      </p>
      {/* data.totalProfit/Rate 사용 (전체 기준) */}
      <ProfitText value={data.totalProfit} rate={data.totalProfitRate} />
    </div>

    {/* 보유 현금 카드 */}
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center text-gray-500">
        <CurrencyDollarIcon className="w-5 h-5 mr-2" />
        <span>보유 현금</span>
      </div>
      <p className="text-3xl font-bold mt-2">{formatCurrency(data.cash)}</p>
    </div>

    {/* 주식 평가액 카드 */}
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center text-gray-500">
        <PresentationChartLineIcon className="w-5 h-5 mr-2" />
        <span>주식 평가액</span>
      </div>
      <p className="text-3xl font-bold mt-2">
        {formatCurrency(data.stockValue)}
      </p>
      {/* --- [수정] 주식만의 손익/수익률 표시 --- */}
      <ProfitText value={stockProfit} rate={stockProfitRate} />
    </div>

    {/* 총 수익률 카드 (전체 수익률 표시) */}
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center text-gray-500">
        <ChartBarIcon className="w-5 h-5 mr-2" />
        <span>총 수익률</span>
      </div>
      {/* data.totalProfitRate 사용 (전체 기준) */}
      <p
        className={`text-3xl font-bold mt-2 ${
          data.totalProfitRate >= 0 ? 'text-red-500' : 'text-blue-500'
        }`}
      >
        {data.totalProfitRate >= 0 && '+'}
        {data.totalProfitRate.toFixed(2)}%
      </p>
      <p className="mt-1 text-sm text-gray-500">
        시작: {formatCurrency(data.initialAssets)}
      </p>
    </div>
  </>
)
