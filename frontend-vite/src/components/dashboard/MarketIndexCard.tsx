import React from 'react'

// 어떤 지수 정보를 받을지 type으로 정의합니다.
interface MarketIndexProps {
  title: string
  value: string
  change: string
  changeRate: string
  isPositive: boolean
}

const MarketIndexCard: React.FC<MarketIndexProps> = ({
  title,
  value,
  change,
  changeRate,
  isPositive,
}) => {
  const textColor = isPositive ? 'text-red-500' : 'text-blue-500'
  const changeIcon = isPositive ? '▲' : '▼'

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h3 className="text-lg font-bold text-gray-800">{title} 🇰🇷</h3>
      <p className={`text-3xl font-bold mt-2 ${textColor}`}>{value}</p>
      <p className={`font-semibold mt-1 ${textColor}`}>
        {changeIcon} {change} ({changeRate})
      </p>
    </div>
  )
}

export default MarketIndexCard
