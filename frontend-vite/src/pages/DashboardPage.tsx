import React, { useState, useEffect, useMemo, useRef } from 'react' // useRef 추가
import axios from 'axios' // 시장 지수, 검색용
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// --- Component Imports ---
import AssetSummary from '../components/dashboard/AssetSummary'
import MyStocksList from '../components/dashboard/MyStocksList'
import MarketIndexCard from '../components/dashboard/MarketIndexCard'
import SearchBar from '../components/search/SearchBar'
import SearchResultsTable, {
  type StockResult,
} from '../components/search/SearchResultsTable'

// --- Data Hook & Utils ---
import { usePortfolioData } from '../hooks/usePortfolioData'
// import { formatCurrency } from '../components/mypage/format'; // 필요 시 사용

// --- Type Definitions ---
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
interface StockListItem {
  stock: { stock_code: string; stock_name: string }
  currentValue: number
  changeAmount: number
  isPositiveChange: boolean
  realTimeData?: { price: string } | null
}

// --- Helper Functions ---
const isMarketOpen = (): boolean => {
  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000
  const kstTime = new Date(now.getTime() + kstOffset)
  const day = kstTime.getUTCDay() // 0: Sunday, 6: Saturday
  const hour = kstTime.getUTCHours()
  const minute = kstTime.getUTCMinutes()
  if (day === 0 || day === 6) return false // Weekend
  if (hour < 9 || (hour === 15 && minute > 30) || hour > 15) return false // Outside market hours
  return true // Otherwise, market is open
}

const parsePrice = (priceStr: string | number): number => {
  if (typeof priceStr === 'number') return priceStr
  return parseFloat(String(priceStr).replace(/,/g, '')) || 0
}

// --- DashboardPage Component ---
const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // --- State Variables ---
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [selectedChart, setSelectedChart] = useState<string>('KOSPI')
  const [loadingMarket, setLoadingMarket] = useState<boolean>(true)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<StockResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Custom Hook for portfolio data
  const {
    isLoading: isLoadingPortfolio,
    error: portfolioError,
    cashBalance,
    stockHoldings,
    totalAssets,
    initialAssets,
  } = usePortfolioData()

  // --- 로딩 시간 측정 로직 ---
  const startTimeRef = useRef<number | null>(null) // 시작 시간 저장 Ref
  const loadTimeLoggedRef = useRef<boolean>(false) // 로그 중복 출력 방지 Ref

  // 컴포넌트 마운트 시 시작 시간 기록
  useEffect(() => {
    startTimeRef.current = performance.now()
    loadTimeLoggedRef.current = false // 로그 기록 플래그 초기화
    console.log('[Perf] DashboardPage Loading Start...')
  }, []) // 마운트 시 1회

  // 로딩 상태 변경 감지 및 완료 시 시간 측정
  useEffect(() => {
    // 모든 로딩 완료 & 아직 로그 기록 전 & 시작 시간이 기록됨
    if (
      !isLoadingPortfolio &&
      !loadingMarket &&
      !loadTimeLoggedRef.current &&
      startTimeRef.current !== null
    ) {
      const endTime = performance.now()
      const loadTime = endTime - startTimeRef.current
      console.log(`[Perf] DashboardPage Loading End.`)
      console.log(`[Perf] Total Page Load Time: ${loadTime.toFixed(0)} ms`)
      loadTimeLoggedRef.current = true // 로그 기록 완료 플래그 설정
    }
  }, [isLoadingPortfolio, loadingMarket]) // 두 로딩 상태 변경 시 실행
  // --- 로딩 시간 측정 로직 끝 ---

  // --- Data Loading Effects ---
  // Market Index Data Loading
  useEffect(() => {
    let isMounted = true
    let intervalId: NodeJS.Timeout | null = null

    const fetchMarketData = async () => {
      if (isMounted) setMarketError(null)
      try {
        const response = await axios.get(
          'http://127.0.0.1:8000/api/stocks/market-index/',
        )
        if (isMounted) {
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
        }
      } catch (err) {
        if (isMounted) {
          setMarketError('시장 지수 데이터를 불러오는 데 실패했습니다.')
          console.error('Market index fetch error:', err)
        }
      } finally {
        // 첫 로딩 시에만 false로 설정
        if (loadingMarket && isMounted) setLoadingMarket(false)
      }
    }

    fetchMarketData() // 마운트 시 즉시 실행

    if (isMarketOpen()) {
      intervalId = setInterval(fetchMarketData, 60000)
    }

    return () => {
      // 클린업 함수
      isMounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, []) // 마운트 시 1회만 실행

  // Search Results Loading
  const lastSearchedTerm = searchParams.get('query')
  useEffect(() => {
    let isMounted = true
    if (lastSearchedTerm) {
      if (isMounted) {
        setIsSearching(true)
        setSearchError(null)
        setSearchResults([])
      }
      const fetchSearchResults = async () => {
        try {
          const response = await axios.get(
            `http://127.0.0.1:8000/api/stocks/search/?query=${lastSearchedTerm}`,
          )
          if (isMounted) {
            const processedData: StockResult[] = response.data.map(
              (stock: any) => ({
                name: stock.name,
                code: stock.code,
                price: stock.price,
                changeRate: 0, // 임시값 - SearchResultsTable에서 처리하거나 API 수정 필요
              }),
            )
            setSearchResults(processedData)
          }
        } catch (err) {
          if (isMounted) {
            setSearchError('검색 중 오류가 발생했습니다.')
            console.error('Search fetch error:', err)
            setSearchResults([])
          }
        } finally {
          if (isMounted) setIsSearching(false)
        }
      }
      fetchSearchResults()
    } else {
      setSearchResults([])
      if (isSearching) setIsSearching(false)
      if (searchError) setSearchError(null)
    }
    return () => {
      isMounted = false
    }
  }, [lastSearchedTerm, isSearching, searchError]) // search 관련 상태 추가

  // --- Event Handlers ---
  const handleSearch = (query: string) => {
    const stockCodeRegex = /^\d{6}$/
    if (stockCodeRegex.test(query)) {
      navigate(`/stock/${query}`)
      return
    }
    setSearchParams({ query: query })
  }
  const handleCloseSearch = () => {
    setSearchParams({}) // Remove query param
  }
  const handleCardClick = (indexName: 'KOSPI' | 'KOSDAQ') => {
    setSelectedChart(indexName)
  }

  // --- Memoized Calculations ---
  // AssetSummary Data
  const totalOverallProfitRate =
    initialAssets > 0
      ? ((totalAssets - initialAssets) / initialAssets) * 100
      : 0

  // MyStocksList Top 5 Data
  const top5Stocks = useMemo((): StockListItem[] => {
    if (isLoadingPortfolio || portfolioError || !stockHoldings) return []

    return [...stockHoldings]
      .map((item) => {
        const currentPrice = item.realTimeData?.price
          ? parsePrice(item.realTimeData.price)
          : parseFloat(item.average_purchase_price) || 0
        const value = currentPrice * item.total_quantity
        const avgPrice = parseFloat(item.average_purchase_price) || 0
        let change = 0
        let isPositive = false
        if (item.realTimeData?.price) {
          change = currentPrice - avgPrice
          isPositive = change >= 0
        }

        return {
          // map 내 return 확인
          stock: item.stock,
          currentValue: value,
          changeAmount: change,
          isPositiveChange: isPositive,
          realTimeData: item.realTimeData,
        }
      })
      .sort((a, b) => b.currentValue - a.currentValue) // 평가금액 기준 정렬
      .slice(0, 5) // 상위 5개
  }, [stockHoldings, isLoadingPortfolio, portfolioError])

  // --- Loading/Error Handling ---
  // 페이지 전체 로딩 상태
  const isPageLoading = loadingMarket || isLoadingPortfolio
  // 페이지 전체 에러 상태
  const pageError = marketError || portfolioError

  // 로딩 UI
  if (isPageLoading) {
    return <div className="text-center mt-20">페이지 로딩 중...</div>
  }
  // 에러 UI
  if (pageError) {
    return <div className="text-center mt-20 text-red-500">{pageError}</div>
  }

  // --- Render ---
  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24 pb-12">
      {/* 검색 바 섹션 */}
      <section className="w-full max-w-2xl mx-auto mb-8">
        <SearchBar
          onSearch={handleSearch}
          isLoading={isSearching}
          initialValue={lastSearchedTerm ?? ''}
          // SearchBarProps에 initialValue?: string; 추가 필요
        />
      </section>

      {/* 조건부 렌더링: 검색 결과 또는 기본 대시보드 */}
      {lastSearchedTerm ? (
        // --- 검색 결과 화면 ---
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
          {isSearching && (
            <p className="text-center text-gray-500">검색 중...</p>
          )}
          {searchError && (
            <p className="text-red-500 text-center">{searchError}</p>
          )}
          {!isSearching && !searchError && searchResults.length === 0 && (
            <p className="text-center text-gray-500">검색 결과가 없습니다.</p>
          )}
          {!isSearching && !searchError && searchResults.length > 0 && (
            <SearchResultsTable results={searchResults} />
          )}
        </section>
      ) : (
        // --- 기본 대시보드 화면 ---
        <div className="space-y-8">
          {/* 시장 지수 및 차트 섹션 */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 코스피/코스닥 카드 */}
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
                      title="코스피 KOSPI"
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
                      title="코스닥 KOSDAQ"
                      value={marketData.kosdaq.value}
                      change={marketData.kosdaq.change}
                      changeRate={marketData.kosdaq.changeRate}
                      isPositive={marketData.kosdaq.isPositive}
                    />
                  </div>
                </>
              )}
            </div>
            {/* 실시간 차트 (이미지) */}
            <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-md flex flex-col justify-center items-center">
              {marketData && (
                <>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {selectedChart === 'KOSPI'
                      ? '코스피 실시간 차트'
                      : '코스닥 실시간 차트'}
                  </h3>
                  <img
                    src={
                      selectedChart === 'KOSPI'
                        ? marketData.kospi.chartSrc
                        : marketData.kosdaq.chartSrc
                    }
                    alt={`${selectedChart} 차트`}
                    className="w-full h-auto"
                  />
                </>
              )}
            </div>
          </section>

          {/* 자산 현황 및 보유 종목 (로그인 시) */}
          {authState.isLoggedIn && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 포트폴리오 로딩/에러 처리 */}
              {isLoadingPortfolio ? (
                <div className="lg:col-span-3 text-center">
                  자산 정보를 불러오는 중...
                </div>
              ) : portfolioError ? (
                <div className="lg:col-span-3 text-center text-red-500">
                  {portfolioError}
                </div>
              ) : (
                <>
                  <AssetSummary
                    totalValue={totalAssets}
                    totalReturnRate={totalOverallProfitRate}
                    cash={cashBalance}
                  />
                  <MyStocksList stocks={top5Stocks} />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  )
}

export default DashboardPage
