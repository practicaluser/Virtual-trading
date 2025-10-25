import React from 'react'
// 💰 axiosInstance와 useEffect 제거
import { type PortfolioItem, type StockRealTimeData } from './mypage.types'
import { formatCurrency } from './format'

interface HoldingRowProps {
  item: PortfolioItem
  // ✨ [수정] undefined 타입 추가
  realTimeData: StockRealTimeData | null | undefined
}

// 쉼표가 포함된 가격 문자열(예: "98,500")을 숫자로 변환
const parsePrice = (priceStr: string | number): number => {
  if (typeof priceStr === 'number') return priceStr
  return parseFloat(priceStr.replace(/,/g, '')) || 0
}

export const HoldingRow: React.FC<HoldingRowProps> = ({
  item,
  realTimeData,
}) => {
  // 💰 useEffect, useState, fetch 로직 모두 제거

  // --- 1. 계산 로직 ---
  const stockName = item.stock.stock_name
  const stockCode = item.stock.stock_code
  const quantity = item.total_quantity
  const avgPrice = parseFloat(item.average_purchase_price)

  // 1b. 실시간 데이터 (Detail API)
  let currentPrice: number | null = null
  let totalValue: number | null = null
  let profitLoss: number | null = null
  let profitLossRate: number | null = null
  let isPositive = false

  // 1c. 실시간 데이터가 로드되었을 때만 계산
  if (realTimeData && realTimeData.price) {
    currentPrice = parsePrice(realTimeData.price)
    totalValue = currentPrice * quantity
    profitLoss = totalValue - avgPrice * quantity
    profitLossRate =
      avgPrice > 0 ? (profitLoss / (avgPrice * quantity)) * 100 : 0
    isPositive = profitLoss >= 0
  }

  const profitColor = isPositive ? 'text-red-500' : 'text-blue-500'

  // 2. 렌더링
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-4">
        <p className="font-semibold text-gray-800">{stockName}</p>
        <p className="text-xs text-gray-400">{stockCode}</p>
      </td>
      <td className="py-4 text-right">{quantity}주</td>
      <td className="py-4 text-right">{formatCurrency(avgPrice)}</td>
      <td className={`py-4 text-right font-semibold ${profitColor}`}>
        {formatCurrency(currentPrice)}
      </td>
      <td className="py-4 text-right">{formatCurrency(totalValue)}</td>
      <td className={`py-4 text-right ${profitColor}`}>
        {isPositive && '+'}
        {typeof profitLossRate === 'number'
          ? `${profitLossRate.toFixed(2)}%`
          : '-%'}
      </td>
      <td className={`py-4 text-right ${profitColor}`}>
        {isPositive && '+'}
        {formatCurrency(profitLoss)}
      </td>
    </tr>
  )
}
