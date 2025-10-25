import React from 'react' // ✨ useState, useEffect 제거
// ✨ axiosInstance 제거
import { type PortfolioItem } from './mypage.types' // ✨ StockRealTimeData 제거 (HoldingRow에서만 필요)
import { HoldingRow } from './HoldingRow'

// Props 타입 (변경 없음, 단 PortfolioItem 타입 정의가 변경됨)
interface HoldingsTableProps {
  data: PortfolioItem[]
}

// 컴포넌트 시그니처 (변경 없음)
export const HoldingsTable: React.FC<HoldingsTableProps> = ({ data }) => {
  // 실시간 가격 조회 및 계산 로직 (useEffect) 제거됨

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">보유 주식</h3>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b text-gray-500 text-sm">
            <th className="py-3">종목명</th>
            <th className="py-3 text-right">보유수량</th>
            <th className="py-3 text-right">평균매입가</th>
            <th className="py-3 text-right">현재가</th>
            <th className="py-3 text-right">평가금액</th>
            <th className="py-3 text-right">수익률</th>
            <th className="py-3 text-right">손익</th>
          </tr>
        </thead>
        <tbody>
          {/* HoldingRow에 item.realTimeData 전달 (이제 PortfolioItem 타입에 포함됨) */}
          {data.map((item) => (
            <HoldingRow
              key={item.stock.stock_code}
              item={item}
              realTimeData={item.realTimeData} // item 안에 포함된 realTimeData 사용
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ✨ export default 제거 (export const 사용 중)
