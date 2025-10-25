import { http, HttpResponse } from 'msw'

// const API_BASE_URL = 'http://127.0.0.1:8000'

// 'export const' 키워드로 handlers 배열을 내보내는 것이 중요합니다.
// export const handlers = [
//   // 1. 회원가입 Mock API (성공)
//   http.post(`${API_BASE_URL}/api/users/signup/`, () => {
//     return HttpResponse.json(
//       {
//         email: 'user@example.com',
//         nickname: '사용자닉네임',
//       },
//       { status: 201 },
//     )
//   }),

//   // 2. 로그인 Mock API (성공)
//   http.post(`${API_BASE_URL}/api/users/login/`, () => {
//     return HttpResponse.json({
//       access: 'fake-access-token',
//       refresh: 'fake-refresh-token',
//     })
//   }),

//   // 3. 마이페이지 조회 Mock API (성공)
//   http.get(`${API_BASE_URL}/api/users/mypage/`, () => {
//     return HttpResponse.json({
//       email: 'user@example.com',
//       nickname: '테스트유저',
//       date_joined: new Date().toISOString(),
//     })
//   }),
// ]

// POST 요청의 body 타입을 명확히 하기 위해 인터페이스를 정의합니다.
interface OrderRequestBody {
  stock: string
  order_type: 'BUY' | 'SELL'
  quantity: number
  price_type: 'MARKET' | 'LIMIT'
  limit_price?: number // 지정가일 때 포함됨
}

export const handlers = [
  // --- 테스트를 위한 주식 상세 페이지 모의 API ---
  // 1. (성공) 주식 상세 정보 로드
  http.get('http://127.0.0.1:8000/api/stocks/detail/005930/', () => {
    return HttpResponse.json({
      name: '삼성전자',
      code: '005930',
      price: '97,400',
      change: '1200',
      change_rate: '+1.25%',
      status: '상승',
      charts: { day: '', week: '', month: '' },
      order_book_5: {},
      order_book_10: {},
    })
    // status: 200은 기본값이므로 생략 가능합니다.
  }),

  // 2. (성공) 실시간 시세 로드 (빈 배열로 응답)
  http.get('http://127.0.0.1:8000/api/stocks/ticks/005930/1/', () => {
    return HttpResponse.json([])
  }),

  // 3. (성공) 일별 시세 로드 (빈 배열로 응답)
  http.get('http://127.0.0.1:8000/api/stocks/daily/005930/1/', () => {
    return HttpResponse.json([])
  }),

  // --- 핵심: 주문 생성 모의 API ---
  // 4. (성공) '매수' 또는 '매도' 주문 (POST)
  http.post(
    'http://127.0.0.1:8000/api/trading/orders/',
    async ({ request }) => {
      // v1의 req.json() 대신 request.json()을 사용합니다.
      const body = (await request.json()) as OrderRequestBody

      // 4-1. (실패) "예수금 부족" 테스트를 위한 특정 수량 (예: 9999)
      if (body.quantity === 9999) {
        return HttpResponse.json(
          { detail: '예수금이 부족합니다.' },
          { status: 400 }, // v1의 ctx.status(400) 대신 객체로 전달
        )
      }

      // 4-2. (실패) "보유 수량 부족" 테스트를 위한 특정 수량 (예: 8888)
      if (
        body.order_type === 'SELL' &&
        (body.quantity === 1 || body.quantity === 8888)
      ) {
        return HttpResponse.json(
          { detail: '보유 수량이 부족합니다.' },
          { status: 400 },
        )
      }

      // 4-3. (성공) 그 외 모든 정상 주문
      const responseStatus =
        body.price_type === 'LIMIT' ? 'PENDING' : 'COMPLETED'

      return HttpResponse.json(
        {
          id: new Date().getTime(),
          stock: {
            stock_code: body.stock,
            stock_name: '삼성전자',
          },
          order_type: body.order_type,
          quantity: body.quantity,
          price_type: body.price_type,
          status: responseStatus, // "PENDING" 또는 "COMPLETED"
          timestamp: new Date().toISOString(),
        },
        { status: 201 }, // 201 Created
      )
    },
  ),
]
