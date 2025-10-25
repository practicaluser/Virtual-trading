// import React, { useState, useEffect } from 'react'
// import axios from 'axios'
// // 1. useNavigate와 함께 useSearchParams를 import 합니다.
// import { useNavigate, useSearchParams } from 'react-router-dom'

// // 컴포넌트 import
// import MarketIndexCard from '../components/dashboard/MarketIndexCard'
// import AssetSummary from '../components/dashboard/AssetSummary'
// import MyStocksList from '../components/dashboard/MyStocksList'
// import { useAuth } from '../contexts/AuthContext'
// import SearchBar from '../components/search/SearchBar'
// import SearchResultsTable, {
//   type StockResult,
// } from '../components/search/SearchResultsTable'

// // 데이터 타입 정의 (기존과 동일)
// interface IndexData {
//   value: string
//   change: string
//   changeRate: string
//   isPositive: boolean
//   chartSrc: string
// }

// interface MarketData {
//   kospi: IndexData
//   kosdaq: IndexData
// }

// // 주식 시장 개장 여부 확인 함수 (기존과 동일)
// const isMarketOpen = () => {
//   const now = new Date()
//   const kstOffset = 9 * 60 * 60 * 1000
//   const kstTime = new Date(now.getTime() + kstOffset)
//   const day = kstTime.getUTCDay()
//   const hour = kstTime.getUTCHours()
//   const minute = kstTime.getUTCMinutes()

//   if (day === 0 || day === 6) return false
//   if (hour < 9 || (hour === 15 && minute > 30) || hour > 15) return false

//   return true
// }

// const DashboardPage: React.FC = () => {
//   const navigate = useNavigate()
//   const { authState } = useAuth()

//   // 2. useSearchParams 훅을 초기화합니다.
//   const [searchParams, setSearchParams] = useSearchParams()

//   // URL에서 'query' 파라미터를 직접 읽어옵니다.
//   const lastSearchedTerm = searchParams.get('query')

//   // 대시보드 상태
//   const [marketData, setMarketData] = useState<MarketData | null>(null)
//   const [selectedChart, setSelectedChart] = useState<string>('KOSPI')
//   const [loading, setLoading] = useState<boolean>(true)
//   const [error, setError] = useState<string | null>(null)

//   // 검색 기능 상태
//   const [searchResults, setSearchResults] = useState<StockResult[]>([])
//   const [isSearching, setIsSearching] = useState(false)
//   const [searchError, setSearchError] = useState<string | null>(null)

//   // 시장 데이터 로딩 로직 (기존과 동일)
//   useEffect(() => {
//     const fetchMarketData = async () => {
//       try {
//         const response = await axios.get(
//           'http://127.0.0.1:8000/api/stocks/market-index/',
//         )
//         const rawData = response.data
//         const formattedData: MarketData = {
//           kospi: {
//             value: rawData.kospi.index,
//             change: rawData.kospi.change,
//             changeRate: rawData.kospi.change_percent,
//             isPositive: rawData.kospi.status === '상승',
//             chartSrc: rawData.kospi.chart_url,
//           },
//           kosdaq: {
//             value: rawData.kosdaq.index,
//             change: rawData.kosdaq.change,
//             changeRate: rawData.kosdaq.change_percent,
//             isPositive: rawData.kosdaq.status === '상승',
//             chartSrc: rawData.kosdaq.chart_url,
//           },
//         }
//         setMarketData(formattedData)
//       } catch (err) {
//         setError('데이터를 불러오는 데 실패했습니다.')
//         console.error(err)
//       } finally {
//         setLoading(false)
//       }
//     }
//     fetchMarketData()

//     if (isMarketOpen()) {
//       const intervalId = setInterval(fetchMarketData, 60000)
//       return () => clearInterval(intervalId)
//     }
//   }, [])

//   // 3. URL 파라미터가 변경될 때마다 검색 API를 호출하는 useEffect
//   useEffect(() => {
//     const query = searchParams.get('query')
//     if (query) {
//       setIsSearching(true)
//       setSearchError(null)

//       const fetchSearchResults = async () => {
//         try {
//           const response = await axios.get(
//             `http://127.0.0.1:8000/api/stocks/search/?query=${query}`,
//           )
//           const processedData: StockResult[] = response.data.map(
//             (stock: any) => {
//               const currentPrice = parseFloat(stock.price.replace(/,/g, ''))
//               const changeValue = stock.changeRate
//               const previousPrice = currentPrice - changeValue
//               const changePercentage =
//                 previousPrice !== 0 ? (changeValue / previousPrice) * 100 : 0
//               return {
//                 name: stock.name,
//                 code: stock.code,
//                 price: stock.price,
//                 changeRate: changePercentage,
//               }
//             },
//           )
//           setSearchResults(processedData)
//         } catch (err) {
//           setSearchError('검색 중 오류가 발생했습니다.')
//           console.error(err)
//           setSearchResults([])
//         } finally {
//           setIsSearching(false)
//         }
//       }

//       fetchSearchResults()
//     } else {
//       setSearchResults([]) // URL에 쿼리가 없으면 결과 초기화
//     }
//   }, [searchParams]) // URL 파라미터가 바뀔 때마다 실행

//   // 4. 검색 실행 함수: 이제 URL만 변경합니다.
//   const handleSearch = (query: string) => {
//     const stockCodeRegex = /^\d{6}$/
//     if (stockCodeRegex.test(query)) {
//       navigate(`/stock/${query}`)
//       return
//     }
//     // URL 변경 -> 위의 useEffect 트리거 -> API 호출
//     setSearchParams({ query: query })
//   }

//   // 5. 검색 닫기 함수: URL 파라미터를 제거합니다.
//   const handleCloseSearch = () => {
//     setSearchParams({})
//   }

//   const handleCardClick = (indexName: string) => {
//     setSelectedChart(indexName)
//   }

//   if (loading) {
//     return <div className="text-center mt-20">데이터를 불러오는 중...</div>
//   }
//   if (error) {
//     return <div className="text-center mt-20 text-red-500">{error}</div>
//   }

//   return (
//     <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24 pb-12">
//       <section className="w-full max-w-2xl mx-auto mb-8">
//         <SearchBar onSearch={handleSearch} isLoading={isSearching} />
//       </section>

//       {/* 6. 조건부 렌더링 기준을 URL 파라미터로 변경 */}
//       {lastSearchedTerm ? (
//         <section className="bg-white p-6 rounded-xl shadow-md space-y-4">
//           <div className="flex justify-between items-center">
//             <h2 className="text-xl font-bold text-gray-800">
//               '{lastSearchedTerm}' 검색 결과
//             </h2>
//             <button
//               onClick={handleCloseSearch}
//               className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
//             >
//               닫기 X
//             </button>
//           </div>
//           {searchError && (
//             <p className="text-red-500 text-center">{searchError}</p>
//           )}
//           {!searchError && <SearchResultsTable results={searchResults} />}
//         </section>
//       ) : (
//         <div className="space-y-8">
//           <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             <div className="lg:col-span-1 space-y-6">
//               {marketData && (
//                 <>
//                   <div
//                     onClick={() => handleCardClick('KOSPI')}
//                     className={`cursor-pointer rounded-xl transition-all duration-200 ${
//                       selectedChart === 'KOSPI'
//                         ? 'ring-2 ring-indigo-500 shadow-lg'
//                         : ''
//                     }`}
//                   >
//                     <MarketIndexCard
//                       title="코스피"
//                       value={marketData.kospi.value}
//                       change={marketData.kospi.change}
//                       changeRate={marketData.kospi.changeRate}
//                       isPositive={marketData.kospi.isPositive}
//                     />
//                   </div>
//                   <div
//                     onClick={() => handleCardClick('KOSDAQ')}
//                     className={`cursor-pointer rounded-xl transition-all duration-200 ${
//                       selectedChart === 'KOSDAQ'
//                         ? 'ring-2 ring-indigo-500 shadow-lg'
//                         : ''
//                     }`}
//                   >
//                     <MarketIndexCard
//                       title="코스닥"
//                       value={marketData.kosdaq.value}
//                       change={marketData.kosdaq.change}
//                       changeRate={marketData.kosdaq.changeRate}
//                       isPositive={marketData.kosdaq.isPositive}
//                     />
//                   </div>
//                 </>
//               )}
//             </div>
//             <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-md flex flex-col justify-center items-center">
//               {marketData && (
//                 <>
//                   <h3 className="text-xl font-bold text-gray-800 mb-4">
//                     {selectedChart === 'KOSPI'
//                       ? '코스피 실시간 차트'
//                       : '코스닥 실시간 차트'}
//                   </h3>
//                   {selectedChart === 'KOSPI' && (
//                     <img
//                       src={marketData.kospi.chartSrc}
//                       alt="코스피 차트"
//                       className="w-full h-auto"
//                     />
//                   )}
//                   {selectedChart === 'KOSDAQ' && (
//                     <img
//                       src={marketData.kosdaq.chartSrc}
//                       alt="코스닥 차트"
//                       className="w-full h-auto"
//                     />
//                   )}
//                 </>
//               )}
//             </div>
//           </section>
//           {authState.isLoggedIn && (
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//               <AssetSummary />
//               <MyStocksList />
//             </div>
//           )}
//         </div>
//       )}
//     </main>
//   )
// }

// export default DashboardPage

import React, { useState, useEffect, useMemo } from 'react'
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
// import { formatCurrency } from '../components/mypage/format'

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

// --- Mock Data ---
// const mockMarketIndexes = [
//   {
//     title: '코스피 KOSPI',
//     value: '3,845.56',
//     change: '38.12',
//     changeRate: '+0.98%',
//     isPositive: true,
//   },
//   {
//     title: '코스닥 KOSDAQ',
//     value: '872.03',
//     change: '7.12',
//     changeRate: '+0.83%',
//     isPositive: true,
//   },
// ]

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

  // --- Data Loading Effects ---
  // Market Index Data Loading
  useEffect(() => {
    let isMounted = true // Mount 상태 추적
    let intervalId: NodeJS.Timeout | null = null

    const fetchMarketData = async () => {
      // 컴포넌트가 마운트된 상태에서만 상태 업데이트 시도
      if (isMounted) setMarketError(null)
      try {
        const response = await axios.get(
          'http://127.0.0.1:8000/api/stocks/market-index/',
        )
        if (isMounted) {
          // 데이터 가공 및 상태 업데이트 전 마운트 상태 확인
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

    // 장중일 경우 1분마다 업데이트
    if (isMarketOpen()) {
      intervalId = setInterval(fetchMarketData, 60000) // 60초
    }

    // 클린업 함수
    return () => {
      isMounted = false // 언마운트 상태로 설정
      if (intervalId) clearInterval(intervalId) // 인터벌 제거
    }
  }, [loadingMarket]) // loadingMarket 상태는 첫 로딩 관리에만 사용 (의도대로라면 빈 배열이 맞을 수 있음)

  // Search Results Loading
  const lastSearchedTerm = searchParams.get('query')
  useEffect(() => {
    let isMounted = true // Mount 상태 추적

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
            // 상태 업데이트 전 확인
            const processedData: StockResult[] = response.data.map(
              (stock: any) => ({
                name: stock.name,
                code: stock.code,
                price: stock.price,
                changeRate: 0, // 임시값
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
      // URL에 쿼리가 없으면 결과 초기화 (상태 업데이트 전 확인 필요 없음)
      setSearchResults([])
    }

    // 클린업 함수
    return () => {
      isMounted = false
    }
  }, [lastSearchedTerm])

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
    setSearchParams({})
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
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 5)
  }, [stockHoldings, isLoadingPortfolio, portfolioError])

  // --- Loading/Error Handling (Market Index) ---
  if (loadingMarket) {
    return <div className="text-center mt-20">시장 정보를 불러오는 중...</div>
  }
  if (marketError) {
    return <div className="text-center mt-20 text-red-500">{marketError}</div>
  }

  // --- Render ---
  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24 pb-12">
      <section className="w-full max-w-2xl mx-auto mb-8">
        {/* SearchBar props 전달 (initialValue는 SearchBarProps에 추가 필요) */}
        <SearchBar
          onSearch={handleSearch}
          isLoading={isSearching}
          initialValue={lastSearchedTerm ?? ''}
        />
      </section>

      {lastSearchedTerm ? (
        // --- 검색 결과 ---
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
          {!isSearching && !searchError && (
            <SearchResultsTable results={searchResults} />
          )}
        </section>
      ) : (
        // --- 기본 대시보드 ---
        <div className="space-y-8">
          {/* 시장 지수 및 차트 */}
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
                    {/* MarketIndexCard props 전달 (MarketIndexProps 확인 필요) */}
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

          {/* 자산 현황 및 보유 종목 */}
          {authState.isLoggedIn && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
