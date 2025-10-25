import axiosInstance from './axiosInstance'

// 1. 주문 요청 페이로드 타입을 확장합니다.
interface OrderPayload {
  stock: string
  order_type: 'BUY' | 'SELL'
  quantity: number
  price_type: 'MARKET' | 'LIMIT' // 'LIMIT' 추가
  limit_price?: number // 지정가 (optional)
}

/**
 * 새로운 주식 주문(매수 또는 매도)을 생성합니다.
 * @param payload - 주문 상세 정보 (종목 코드, 주문 타입, 수량 등)
 * @returns 성공 시 API로부터 받은 주문 객체 데이터를 반환합니다.
 */
export const createOrder = async (payload: OrderPayload) => {
  // 2. apiPayload를 재조립하는 로직을 모두 제거합니다.
  //    payload 객체에 limit_price가 'undefined'로 포함되어 있어도
  //    axios가 JSON으로 변환하면서 해당 키를 자동으로 생략합니다.
  const response = await axiosInstance.post(
    '/api/trading/orders/',
    payload, // 3. payload를 그대로 전송합니다.
  )
  return response.data
}
