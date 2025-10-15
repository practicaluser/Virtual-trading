import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://127.0.0.1:8000'

// 'export const' 키워드로 handlers 배열을 내보내는 것이 중요합니다.
export const handlers = [
  // 1. 회원가입 Mock API (성공)
  http.post(`${API_BASE_URL}/api/users/signup/`, () => {
    return HttpResponse.json(
      {
        email: 'user@example.com',
        nickname: '사용자닉네임',
      },
      { status: 201 },
    )
  }),

  // 2. 로그인 Mock API (성공)
  http.post(`${API_BASE_URL}/api/users/login/`, () => {
    return HttpResponse.json({
      access: 'fake-access-token',
      refresh: 'fake-refresh-token',
    })
  }),

  // 3. 마이페이지 조회 Mock API (성공)
  http.get(`${API_BASE_URL}/api/users/mypage/`, () => {
    return HttpResponse.json({
      email: 'user@example.com',
      nickname: '테스트유저',
      date_joined: new Date().toISOString(),
    })
  }),
]
