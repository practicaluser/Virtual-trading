import React, { useState, useEffect, useMemo } from 'react'

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (
    quantity: number,
    priceType: 'LIMIT' | 'MARKET',
    limitPrice: number,
    orderType: 'BUY' | 'SELL',
  ) => void
  initialOrderType: 'BUY' | 'SELL' // StockHeader에서 누른 버튼
  stockName: string
  isLoading: boolean
  currentPrice: number // 현재가를 받아옴
}

const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialOrderType,
  stockName,
  isLoading,
  currentPrice,
}) => {
  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState(initialOrderType)
  const [orderPriceType, setOrderPriceType] = useState<'LIMIT' | 'MARKET'>(
    'LIMIT',
  )
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(currentPrice)

  // --- 효과 ---
  // 모달이 열릴 때마다 상태를 초기화
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialOrderType)
      setOrderPriceType('LIMIT') // 기본값을 '지정가'로
      setQuantity(1)
      setPrice(currentPrice) // 현재가를 지정가 기본값으로
    }
  }, [isOpen, initialOrderType, currentPrice])

  // --- 계산된 값 ---
  // 주문 총액 계산
  const totalAmount = useMemo(() => {
    if (orderPriceType === 'LIMIT') {
      return (isNaN(quantity) ? 0 : quantity) * (isNaN(price) ? 0 : price)
    }
    // 시장가는 현재가 기준으로 *예상* 총액을 표시
    return (isNaN(quantity) ? 0 : quantity) * currentPrice
  }, [quantity, price, orderPriceType, currentPrice])

  // --- 이벤트 핸들러 ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isNaN(quantity) || quantity <= 0) {
      alert('주문 수량은 1 이상의 숫자여야 합니다.')
      return
    }
    if (orderPriceType === 'LIMIT' && (isNaN(price) || price <= 0)) {
      alert('지정가 주문 가격을 올바르게 입력해주세요.')
      return
    }
    onSubmit(quantity, orderPriceType, price, activeTab)
  }

  if (!isOpen) return null

  // --- 탭 및 버튼 스타일 ---
  const isBuy = activeTab === 'BUY'
  const buyTabClasses = isBuy
    ? 'bg-red-500 text-white'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  const sellTabClasses = !isBuy
    ? 'bg-blue-500 text-white'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  const submitButtonClasses = isBuy
    ? `bg-red-500 hover:bg-red-600`
    : `bg-blue-500 hover:bg-blue-600`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm p-0 bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. 매수/매도 탭 */}
        <div className="grid grid-cols-2">
          <button
            onClick={() => setActiveTab('BUY')}
            className={`w-full py-3 font-bold rounded-t-lg ${buyTabClasses} transition-colors`}
          >
            매수
          </button>
          <button
            onClick={() => setActiveTab('SELL')}
            className={`w-full py-3 font-bold rounded-t-lg ${sellTabClasses} transition-colors`}
          >
            매도
          </button>
        </div>

        {/* 2. 폼 영역 */}
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="text-center">
            <h2 className="text-xl font-bold">{stockName}</h2>
          </div>

          {/* 주문구분 (지정가/시장가) */}
          <div>
            <label
              htmlFor="orderPriceType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              주문구분
            </label>
            <select
              id="orderPriceType"
              value={orderPriceType}
              onChange={(e) =>
                setOrderPriceType(e.target.value as 'LIMIT' | 'MARKET')
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="LIMIT">지정가</option>
              <option value="MARKET">시장가</option>
            </select>
          </div>

          {/* 주문수량 */}
          <div>
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              주문수량
            </label>
            <input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full p-2 border border-gray-300 rounded-md text-right focus:ring-indigo-500 focus:border-indigo-500"
              min="1"
              autoFocus
            />
          </div>

          {/* 주문가격 (지정가일 때만 보임) */}
          {orderPriceType === 'LIMIT' && (
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                주문가격
              </label>
              <input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2 border border-gray-300 rounded-md text-right focus:ring-indigo-500 focus:border-indigo-500"
                min="0"
                step="100" // (선택) 주식 가격 단위에 맞게 조절
              />
            </div>
          )}

          {/* 주문 총액 */}
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center text-lg">
              <span className="font-medium text-gray-700">주문 총액</span>
              <span className="font-bold">
                {totalAmount.toLocaleString()} 원
              </span>
            </div>
            {orderPriceType === 'MARKET' && (
              <p className="text-sm text-gray-500 text-right">
                *현재가 기준 예상 금액
              </p>
            )}
          </div>

          {/* 3. 하단 버튼 */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 text-white font-bold rounded-lg transition-colors ${submitButtonClasses} ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading
                ? '주문 처리 중...'
                : `${isBuy ? '매수' : '매도'} 주문`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OrderModal
