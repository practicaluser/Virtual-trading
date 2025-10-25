import { type ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LoginPage from './LoginPage'
import MyPage from './MyPage' // 리다이렉션 확인을 위해 import
import { AuthProvider } from '../contexts/AuthContext' // AuthProvider import
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

// 테스트를 위한 Wrapper 컴포넌트 생성 (AuthProvider와 Router 포함)
const renderWithProviders = (ui: ReactElement, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route)

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/login" element={ui} />
          <Route path="/mypage" element={<MyPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('LoginPage', () => {
  // --- 시나리오 1: 로그인 성공 ---
  test('성공적으로 로그인을 하고 마이페이지로 이동한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })

    // 1. 사용자 입력 시뮬레이션
    await user.type(screen.getByLabelText('이메일'), 'user@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password123')

    // 2. '로그인' 버튼 클릭
    await user.click(screen.getByRole('button', { name: '로그인' }))

    // 3. 결과 검증
    // 마이페이지로 성공적으로 이동했는지 확인 (마이페이지의 제목을 찾음)
    expect(
      await screen.findByRole('heading', { name: '마이페이지' }),
    ).toBeInTheDocument()
  })

  // --- 시나리오 2: 로그인 실패 (자격 증명 불일치) ---
  test('잘못된 이메일 또는 비밀번호 입력 시 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup()

    // 이 테스트를 위해 msw 핸들러를 일시적으로 오버라이드합니다.
    server.use(
      http.post('http://127.0.0.1:8000/api/users/login/', () => {
        return new HttpResponse(null, { status: 401 }) // 401 Unauthorized 에러 반환
      }),
    )

    renderWithProviders(<LoginPage />, { route: '/login' })

    // 1. 사용자 입력 시뮬레이션
    await user.type(screen.getByLabelText('이메일'), 'wrong@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'wrongpassword')

    // 2. '로그인' 버튼 클릭
    await user.click(screen.getByRole('button', { name: '로그인' }))

    // 3. 결과 검증
    // 에러 메시지가 화면에 표시되었는지 확인
    expect(
      await screen.findByText('이메일 또는 비밀번호가 일치하지 않습니다.'),
    ).toBeInTheDocument()

    // 마이페이지로 이동하지 않았는지 확인 (마이페이지 제목이 없어야 함)
    expect(
      screen.queryByRole('heading', { name: '마이페이지' }),
    ).not.toBeInTheDocument()
  })
})
