import React, { type ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MyPage from '../pages/MyPage'
import { AuthProvider } from '../contexts/AuthContext'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

const renderWithProviders = () => {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/mypage']}>
        <Routes>
          <Route path="/mypage" element={<MyPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('자동 토큰 재발급 통합 테스트', () => {
  // 1. 실제 localStorage처럼 동작할 가짜 저장소 객체 생성
  let store: { [key: string]: string } = {}

  // 2. localStorage의 함수들을 가짜 저장소와 연동
  beforeAll(() => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key) => store[key] || null,
    )
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      store[key] = value.toString()
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete store[key]
    })
  })

  // 3. 각 테스트가 시작되기 전에 가짜 저장소를 깨끗하게 비움
  beforeEach(() => {
    store = {}
  })

  // 4. 모든 테스트가 끝나면 Mock을 원래대로 복원
  afterAll(() => {
    vi.restoreAllMocks()
  })

  test('Access Token 만료 시, 자동으로 토큰을 재발급받아 API 요청을 성공시킨다', async () => {
    // 5. 이 테스트를 위한 초기 localStorage 상태 설정
    store['accessToken'] = 'expired-token'
    store['refreshToken'] = 'valid-refresh-token'

    server.use(
      http.get(
        'http://127.0.0.1:8000/api/users/mypage/',
        () => {
          return new HttpResponse(null, { status: 401 })
        },
        { once: true },
      ),
      http.post('http://127.0.0.1:8000/api/users/login/refresh/', () => {
        return HttpResponse.json({ access: 'new-fake-access-token' })
      }),
      http.get('http://127.0.0.1:8000/api/users/mypage/', () => {
        return HttpResponse.json({
          email: 'user@example.com',
          nickname: '테스트유저',
          date_joined: new Date().toISOString(),
        })
      }),
    )

    renderWithProviders()

    // 최종적으로 화면에 성공적으로 받아온 "테스트유저" 닉네임이 표시되는지 확인
    expect(await screen.findByText('테스트유저')).toBeInTheDocument()
  })
})
