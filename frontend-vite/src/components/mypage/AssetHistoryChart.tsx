import React from 'react'
import { type AssetHistoryData } from './mypage.types'

interface AssetHistoryChartProps {
  data: AssetHistoryData[]
}

export const AssetHistoryChart: React.FC<AssetHistoryChartProps> = ({
  data,
}) => {
  // 1. [수정] value를 숫자로 변환 후 최대값 계산
  const numericValues = data.map((item) => parseFloat(item.value) || 0) // 문자열을 숫자로, 변환 실패 시 0
  const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 0

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-6">자산 변화 추이</h3>
      <div className="flex items-stretch justify-between h-64">
        {data.map((item, index) => {
          // 2. [수정] 현재 item의 value도 숫자로 변환하여 사용
          const currentValue = parseFloat(item.value) || 0
          const heightPercent =
            maxValue > 0 ? (currentValue / maxValue) * 100 : 0

          const style = { height: `${heightPercent}%` }

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center justify-end px-2"
            >
              <div
                className="w-full bg-indigo-200 rounded-t-md hover:bg-indigo-400 transition-colors"
                style={style}
                // 3. [수정] title에도 숫자 변환 및 toLocaleString 적용
                title={`${item.month}: ${currentValue.toLocaleString()}원`}
              ></div>
              <span className="text-xs text-gray-500 mt-2">{item.month}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
