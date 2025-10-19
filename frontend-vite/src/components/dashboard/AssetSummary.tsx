import React from 'react'

const AssetSummary: React.FC = () => {
  // 임시(Mock) 데이터
  const assetData = {
    totalValue: '₩15,234,500',
    totalReturnRate: '+52.34%',
    cash: '₩2,345,000',
  }

  return (
    <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">총 자산 현황</h3>
      <div className="space-y-3">
        <div>
          <p className="text-gray-500">총 평가금액</p>
          <p className="text-2xl font-bold">{assetData.totalValue}</p>
        </div>
        <div>
          <p className="text-gray-500">총 수익률</p>
          <p className="text-xl font-bold text-red-500">
            {assetData.totalReturnRate}
          </p>
        </div>
        <div>
          <p className="text-gray-500">보유 현금</p>
          <p className="text-xl font-bold">{assetData.cash}</p>
        </div>
      </div>
    </div>
  )
}

export default AssetSummary
