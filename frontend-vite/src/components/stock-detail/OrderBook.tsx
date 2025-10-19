// src/components/stock-detail/OrderBook.tsx

import React, { useState } from 'react'

// API 응답에 맞는 타입 정의
interface OrderData {
  price: string
  volume: string
}

interface OrderBookData {
  asks: OrderData[]
  bids: OrderData[]
  total_ask_volume: string
  total_bid_volume: string
}

interface OrderBookProps {
  orderBook5: OrderBookData
  orderBook10: OrderBookData
}

const OrderBook: React.FC<OrderBookProps> = ({ orderBook5, orderBook10 }) => {
  const [level, setLevel] = useState<5 | 10>(10)

  const asksData = (level === 5 ? orderBook5?.asks : orderBook10?.asks) || []
  const bidsData = (level === 5 ? orderBook5?.bids : orderBook10?.bids) || []
  const totalAskQty =
    level === 5 ? orderBook5?.total_ask_volume : orderBook10?.total_ask_volume
  const totalBidQty =
    level === 5 ? orderBook5?.total_bid_volume : orderBook10?.total_bid_volume

  // --- 매도 호가(ask)는 UI에서 고가 → 저가 순으로 표시하기 위해 역순 ---
  const asksToShow = [...asksData].reverse()
  const bidsToShow = bidsData

  // 데이터 로딩 중일 때
  if (!asksToShow.length || !bidsToShow.length) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-4">호가</h2>
        <p className="text-center text-gray-500">호가 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">호가</h2>
        <div className="flex space-x-2 text-sm">
          <button
            onClick={() => setLevel(5)}
            className={
              level === 5 ? 'font-bold text-gray-900' : 'text-gray-400'
            }
          >
            ▶ 5단계
          </button>
          <button
            onClick={() => setLevel(10)}
            className={
              level === 10 ? 'font-bold text-gray-900' : 'text-gray-400'
            }
          >
            ▶ 10단계
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border border-gray-200 bg-gray-200">
        {/* --- 매도 (Ask) 영역 --- */}
        <div className="bg-blue-50">
          <div className="grid grid-cols-2 text-center font-semibold py-2 bg-white border-b border-gray-200">
            <div>매도잔량</div>
            <div className="border-l border-gray-200">매도호가</div>
          </div>

          {asksToShow.map((ask, index) => (
            <React.Fragment key={ask.price}>
              <div className="grid grid-cols-2 text-right border-b border-gray-200">
                <span className="py-1 px-3 text-blue-600">{ask.volume}</span>
                <span className="py-1 px-3 text-blue-600 font-bold border-l border-gray-200">
                  {ask.price}
                </span>
              </div>
              {level === 10 && index === 4 && (
                <div className="col-span-2 h-px bg-gray-300" />
              )}
            </React.Fragment>
          ))}

          {level === 5 &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`empty-ask-${i}`}
                className="grid grid-cols-2 text-right border-b border-gray-200 bg-white"
              >
                <span className="py-1 px-3">&nbsp;</span>
                <span className="py-1 px-3 border-l border-gray-200">
                  &nbsp;
                </span>
              </div>
            ))}
        </div>

        {/* --- 매수 (Bid) 영역 --- */}
        <div className="bg-red-50">
          <div className="grid grid-cols-2 text-center font-semibold py-2 bg-white border-b border-gray-200">
            <div>매수호가</div>
            <div className="border-l border-gray-200">매수잔량</div>
          </div>

          {level === 5 && (
            <>
              {/* 위쪽 빈칸 5개 (배경색 없음) */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`empty-top-bid-${i}`}
                  className="grid grid-cols-2 text-right border-b border-gray-200 bg-white"
                >
                  <span className="py-1 px-3">&nbsp;</span>
                  <span className="py-1 px-3 border-l border-gray-200">
                    &nbsp;
                  </span>
                </div>
              ))}
            </>
          )}

          {/* 실제 매수 데이터 */}
          {bidsToShow.map((bid, index) => (
            <React.Fragment key={bid.price}>
              <div className="grid grid-cols-2 text-right border-b border-gray-200 bg-red-50">
                <span className="py-1 px-3 text-red-600 font-bold">
                  {bid.price}
                </span>
                <span className="py-1 px-3 text-red-600 border-l border-gray-200">
                  {bid.volume}
                </span>
              </div>
              {level === 10 && index === 4 && (
                <div className="col-span-2 h-px bg-gray-300" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* --- 잔량합계 --- */}
      <div className="grid grid-cols-4 gap-px border border-t-0 border-gray-200 bg-gray-200">
        <div className="bg-white p-2 text-right">
          <span className="font-bold text-blue-600">{totalAskQty}</span>
        </div>
        <div className="col-span-2 bg-white p-2 text-center border-l border-r border-gray-200">
          <span className="font-bold">잔량합계</span>
        </div>
        <div className="bg-white p-2 text-right">
          <span className="font-bold text-red-600">{totalBidQty}</span>
        </div>
      </div>
    </div>
  )
}

export default OrderBook
