import React from 'react'
import { formatCurrency } from './format' // <-- 경로가 로컬(./)로 변경되었습니다.

interface ProfitTextProps {
  value: number
  rate: number
}

/**
 * 수익/손실에 따라 색상과 +,- 기호를 표시하는 공통 컴포넌트
 */
export const ProfitText: React.FC<ProfitTextProps> = ({ value, rate }) => {
  const isPositive = value >= 0
  const color = isPositive ? 'text-red-500' : 'text-blue-500'
  const sign = isPositive ? '+' : ''

  return (
    <p className={`mt-1 text-sm ${color}`}>
      {sign}
      {formatCurrency(value)} ({sign}
      {rate.toFixed(2)}%)
    </p>
  )
}
