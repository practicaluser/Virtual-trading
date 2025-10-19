// src/pages/StockSearchPage.tsx

import React, { useState } from 'react'
import axios from 'axios' // API 통신을 위해 axios 사용
import SearchBar from '../components/search/SearchBar'
import SearchResultsTable, {
  type StockResult,
} from '../components/search/SearchResultsTable'

const StockSearchPage: React.FC = () => {
  const [searchResults, setSearchResults] = useState<StockResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSearchedTerm, setLastSearchedTerm] = useState<string>('')

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    setError(null)
    setLastSearchedTerm(query)

    try {
      // 1. 실제 백엔드 API를 호출합니다.
      const response = await axios.get(
        `http://127.0.0.1:8000/api/stocks/search/?query=${query}`,
      )

      // 2. 백엔드에서 받은 데이터를 프론트엔드 형식에 맞게 가공합니다.
      const processedData: StockResult[] = response.data.map((stock: any) => {
        const currentPrice = parseFloat(stock.price.replace(/,/g, '')) // "58,100" -> 58100
        const changeValue = stock.changeRate // 백엔드에서 받은 등락 '값' (예: 500)

        // 등락 '률'(%) 계산
        const previousPrice = currentPrice - changeValue
        const changePercentage =
          previousPrice !== 0 ? (changeValue / previousPrice) * 100 : 0

        return {
          name: stock.name,
          code: stock.code,
          price: stock.price,
          changeRate: changePercentage, // 계산된 등락 '률'을 넘겨줍니다.
        }
      })

      setSearchResults(processedData)
    } catch (err) {
      setError('검색 중 오류가 발생했습니다. 다시 시도해주세요.')
      console.error(err) // 콘솔에서 실제 에러 확인
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-28 space-y-8">
      {/* 상단 탭 메뉴 (임시) */}
      {/* <div className="bg-white rounded-lg shadow p-2 flex space-x-2">
        <button className="px-4 py-2 text-indigo-600 bg-indigo-100 font-bold rounded-md">
          주식 검색
        </button>
      </div> */}

      {/* 주식 검색 섹션 */}
      <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">주식 검색</h2>
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {/* 검색 결과 섹션 */}
      {lastSearchedTerm && (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
          <h2 className="text-xl font-bold text-gray-800">
            '{lastSearchedTerm}' 검색 결과
          </h2>
          {error && <p className="text-red-500 text-center">{error}</p>}
          {!error && <SearchResultsTable results={searchResults} />}
        </div>
      )}
    </div>
  )
}

export default StockSearchPage
