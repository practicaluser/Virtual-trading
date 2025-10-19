import React, { useState, useEffect } from 'react'
import axios from 'axios'
// 1. useNavigate와 함께 useSearchParams를 import 합니다.
import { useNavigate, useSearchParams } from 'react-router-dom'

// 컴포넌트 import
import MarketIndexCard from '../components/dashboard/MarketIndexCard'
import AssetSummary from '../components/dashboard/AssetSummary'
import MyStocksList from '../components/dashboard/MyStocksList'
import { useAuth } from '../contexts/AuthContext'
import SearchBar from '../components/search/SearchBar'
import SearchResultsTable, {
  type StockResult,
} from '../components/search/SearchResultsTable'

// 데이터 타입 정의 (기존과 동일)
interface IndexData {
  value: string
  change: string
  changeRate: string
  isPositive: boolean
  chartSrc: string
}

interface MarketData {
  kospi: IndexData
  kosdaq: IndexData
}

// 주식 시장 개장 여부 확인 함수 (기존과 동일)
const isMarketOpen = () => {
  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000
  const kstTime = new Date(now.getTime() + kstOffset)
  const day = kstTime.getUTCDay()
  const hour = kstTime.getUTCHours()
  const minute = kstTime.getUTCMinutes()

  if (day === 0 || day === 6) return false
  if (hour < 9 || (hour === 15 && minute > 30) || hour > 15) return false

  return true
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { authState } = useAuth()

  // 2. useSearchParams 훅을 초기화합니다.
  const [searchParams, setSearchParams] = useSearchParams()

  // URL에서 'query' 파라미터를 직접 읽어옵니다.
  const lastSearchedTerm = searchParams.get('query')

  // 대시보드 상태
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [selectedChart, setSelectedChart] = useState<string>('KOSPI')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // 검색 기능 상태
  const [searchResults, setSearchResults] = useState<StockResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // 시장 데이터 로딩 로직 (기존과 동일)
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await axios.get(
          'http://127.0.0.1:8000/api/stocks/market-index/',
        )
        const rawData = response.data
        const formattedData: MarketData = {
          kospi: {
            value: rawData.kospi.index,
            change: rawData.kospi.change,
            changeRate: rawData.kospi.change_percent,
            isPositive: rawData.kospi.status === '상승',
            chartSrc: rawData.kospi.chart_url,
          },
          kosdaq: {
            value: rawData.kosdaq.index,
            change: rawData.kosdaq.change,
            changeRate: rawData.kosdaq.change_percent,
            isPositive: rawData.kosdaq.status === '상승',
            chartSrc: rawData.kosdaq.chart_url,
          },
        }
        setMarketData(formattedData)
      } catch (err) {
        setError('데이터를 불러오는 데 실패했습니다.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchMarketData()

    if (isMarketOpen()) {
      const intervalId = setInterval(fetchMarketData, 60000)
      return () => clearInterval(intervalId)
    }
  }, [])

  // 3. URL 파라미터가 변경될 때마다 검색 API를 호출하는 useEffect
  useEffect(() => {
    const query = searchParams.get('query')
    if (query) {
      setIsSearching(true)
      setSearchError(null)

      const fetchSearchResults = async () => {
        try {
          const response = await axios.get(
            `http://127.0.0.1:8000/api/stocks/search/?query=${query}`,
          )
          const processedData: StockResult[] = response.data.map(
            (stock: any) => {
              const currentPrice = parseFloat(stock.price.replace(/,/g, ''))
              const changeValue = stock.changeRate
              const previousPrice = currentPrice - changeValue
              const changePercentage =
                previousPrice !== 0 ? (changeValue / previousPrice) * 100 : 0
              return {
                name: stock.name,
                code: stock.code,
                price: stock.price,
                changeRate: changePercentage,
              }
            },
          )
          setSearchResults(processedData)
        } catch (err) {
          setSearchError('검색 중 오류가 발생했습니다.')
          console.error(err)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      }

      fetchSearchResults()
    } else {
      setSearchResults([]) // URL에 쿼리가 없으면 결과 초기화
    }
  }, [searchParams]) // URL 파라미터가 바뀔 때마다 실행

  // 4. 검색 실행 함수: 이제 URL만 변경합니다.
  const handleSearch = (query: string) => {
    const stockCodeRegex = /^\d{6}$/
    if (stockCodeRegex.test(query)) {
      navigate(`/stock/${query}`)
      return
    }
    // URL 변경 -> 위의 useEffect 트리거 -> API 호출
    setSearchParams({ query: query })
  }

  // 5. 검색 닫기 함수: URL 파라미터를 제거합니다.
  const handleCloseSearch = () => {
    setSearchParams({})
  }

  const handleCardClick = (indexName: string) => {
    setSelectedChart(indexName)
  }

  if (loading) {
    return <div className="text-center mt-20">데이터를 불러오는 중...</div>
  }
  if (error) {
    return <div className="text-center mt-20 text-red-500">{error}</div>
  }

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24 pb-12">
      <section className="w-full max-w-2xl mx-auto mb-8">
        <SearchBar onSearch={handleSearch} isLoading={isSearching} />
      </section>

      {/* 6. 조건부 렌더링 기준을 URL 파라미터로 변경 */}
      {lastSearchedTerm ? (
        <section className="bg-white p-6 rounded-xl shadow-md space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
              '{lastSearchedTerm}' 검색 결과
            </h2>
            <button
              onClick={handleCloseSearch}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              닫기 X
            </button>
          </div>
          {searchError && (
            <p className="text-red-500 text-center">{searchError}</p>
          )}
          {!searchError && <SearchResultsTable results={searchResults} />}
        </section>
      ) : (
        <div className="space-y-8">
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {marketData && (
                <>
                  <div
                    onClick={() => handleCardClick('KOSPI')}
                    className={`cursor-pointer rounded-xl transition-all duration-200 ${
                      selectedChart === 'KOSPI'
                        ? 'ring-2 ring-indigo-500 shadow-lg'
                        : ''
                    }`}
                  >
                    <MarketIndexCard
                      title="코스피"
                      value={marketData.kospi.value}
                      change={marketData.kospi.change}
                      changeRate={marketData.kospi.changeRate}
                      isPositive={marketData.kospi.isPositive}
                    />
                  </div>
                  <div
                    onClick={() => handleCardClick('KOSDAQ')}
                    className={`cursor-pointer rounded-xl transition-all duration-200 ${
                      selectedChart === 'KOSDAQ'
                        ? 'ring-2 ring-indigo-500 shadow-lg'
                        : ''
                    }`}
                  >
                    <MarketIndexCard
                      title="코스닥"
                      value={marketData.kosdaq.value}
                      change={marketData.kosdaq.change}
                      changeRate={marketData.kosdaq.changeRate}
                      isPositive={marketData.kosdaq.isPositive}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-md flex flex-col justify-center items-center">
              {marketData && (
                <>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {selectedChart === 'KOSPI'
                      ? '코스피 실시간 차트'
                      : '코스닥 실시간 차트'}
                  </h3>
                  {selectedChart === 'KOSPI' && (
                    <img
                      src={marketData.kospi.chartSrc}
                      alt="코스피 차트"
                      className="w-full h-auto"
                    />
                  )}
                  {selectedChart === 'KOSDAQ' && (
                    <img
                      src={marketData.kosdaq.chartSrc}
                      alt="코스닥 차트"
                      className="w-full h-auto"
                    />
                  )}
                </>
              )}
            </div>
          </section>
          {authState.isLoggedIn && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <AssetSummary />
              <MyStocksList />
            </div>
          )}
        </div>
      )}
    </main>
  )
}

export default DashboardPage
