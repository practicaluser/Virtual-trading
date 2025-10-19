// src/components/stock-detail/ChartSection.tsx

import React, { useState } from 'react'

type ChartType = 'day' | 'week' | 'month'

interface ChartSectionProps {
  charts: {
    day: string
    week: string
    month: string
  }
}

const ChartSection: React.FC<ChartSectionProps> = ({ charts }) => {
  const [chartType, setChartType] = useState<ChartType>('day')

  const getButtonClass = (type: ChartType) => {
    return chartType === type
      ? 'bg-gray-200 text-gray-900 font-bold'
      : 'text-gray-500 hover:bg-gray-100'
  }

  const chartUrl = charts[chartType]
  const cleanedChartUrl = chartUrl.replace(/[<>]/g, '')

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-4">
        {/* ... (h2, button 등 탭 UI는 동일) ... */}
        <h2 className="text-xl font-bold">차트</h2>
        <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setChartType('day')}
            className={`px-3 py-1 rounded-md ${getButtonClass('day')}`}
          >
            일
          </button>
          <button
            onClick={() => setChartType('week')}
            className={`px-3 py-1 rounded-md ${getButtonClass('week')}`}
          >
            주
          </button>
          <button
            onClick={() => setChartType('month')}
            className={`px-3 py-1 rounded-md ${getButtonClass('month')}`}
          >
            월
          </button>
        </div>
      </div>

      {/* --- ⬇️ 1. 차트 컨테이너 수정 ⬇️ --- */}
      {/* 'h-96', 'flex', 'items-center', 'justify-center'를 제거합니다. */}
      <div className="bg-gray-50 rounded-lg overflow-hidden">
        {cleanedChartUrl ? (
          <img
            src={cleanedChartUrl}
            alt={`${chartType} chart`}
            // --- ⬇️ 2. 이미지 클래스 수정 ⬇️ ---
            // 'h-full object-contain'을 'h-auto'로 변경합니다.
            className="w-full h-auto"
          />
        ) : (
          <p className="text-gray-400 p-20 text-center">
            차트 이미지를 불러올 수 없습니다.
          </p>
        )}
      </div>
    </div>
  )
}

export default ChartSection
