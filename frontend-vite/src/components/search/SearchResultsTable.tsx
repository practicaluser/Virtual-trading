// src/components/search/SearchResultsTable.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'

// 검색 결과 데이터의 타입을 정의합니다.
export interface StockResult {
  name: string
  code: string
  price: string
  changeRate: number // 등락률을 숫자로 받아 처리
}

interface SearchResultsTableProps {
  results: StockResult[]
}

const SearchResultsTable: React.FC<SearchResultsTableProps> = ({ results }) => {
  const navigate = useNavigate() // navigate 함수 생성

  // 행 클릭 시 상세 페이지로 이동하는 핸들러
  const handleRowClick = (code: string) => {
    navigate(`/stock/${code}`)
  }

  if (results.length === 0) {
    return (
      <p className="text-gray-500 text-center py-4">검색 결과가 없습니다.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="border-b">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">
              종목명
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">
              종목코드
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">
              현재가
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">
              등락률
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((stock) => (
            // <tr>에 onClick 이벤트와 cursor-pointer 스타일 추가

            <tr
              key={stock.code}
              className="border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => handleRowClick(stock.code)}
            >
              <td className="py-3 px-4">{stock.name}</td>
              <td className="py-3 px-4">{stock.code}</td>
              <td className="py-3 px-4">{stock.price}</td>
              <td
                className={`py-3 px-4 font-semibold ${
                  stock.changeRate >= 0 ? 'text-red-500' : 'text-blue-500'
                }`}
              >
                {stock.changeRate >= 0 ? '+' : ''}
                {stock.changeRate.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SearchResultsTable
