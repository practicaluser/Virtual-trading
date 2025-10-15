import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import SignupPage from './SignupPage'
import LoginPage from './LoginPage' // 리다이렉션 확인을 위해 import
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from '../contexts/AuthContext'

// 테스트를 위한 라우팅 환경에 AuthProvider를 추가
const TestRouterWrapper = () => (
  <AuthProvider>
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  </AuthProvider>
)

// 테스트를 위한 라우팅 환경 설정
const TestRouter = () => (
  <Routes>
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/login" element={<LoginPage />} />
  </Routes>
)

describe('SignupPage', () => {
  // window.alert를 모킹(mocking)하여 테스트 환경에서 실제로 팝업이 뜨지 않도록 함
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

  // 각 테스트가 끝나면 스파이를 초기화
  afterEach(() => {
    vi.clearAllMocks()
  })

  // --- 시나리오 1: 회원가입 성공 ---
  test('성공적으로 회원가입을 하고 로그인 페이지로 이동한다', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <TestRouterWrapper />
      </MemoryRouter>,
    )

    // 1. 사용자 입력 시뮬레이션
    await user.type(screen.getByLabelText('이메일'), 'newuser@example.com')
    await user.type(screen.getByLabelText('닉네임'), '새로운유저')
    await user.type(screen.getByLabelText('비밀번호'), 'password123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password123')

    // 2. '계정 생성하기' 버튼 클릭
    await user.click(screen.getByRole('button', { name: '계정 생성하기' }))

    // 3. 결과 검증
    // 성공 alert가 올바른 메시지와 함께 호출되었는지 확인
    expect(alertSpy).toHaveBeenCalledWith(
      '회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.',
    )

    // 로그인 페이지로 성공적으로 이동했는지 확인 (로그인 페이지의 제목을 찾음)
    expect(
      await screen.findByRole('heading', { name: '로그인' }),
    ).toBeInTheDocument()
  })

  // --- 시나리오 2: 회원가입 실패 (이메일 중복) ---
  test('이미 존재하는 이메일로 가입 시 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup()
    const DUPLICATE_EMAIL = 'duplicate@example.com'

    // 이 테스트를 위해 msw 핸들러를 일시적으로 오버라이드합니다.
    server.use(
      http.post('http://127.0.0.1:8000/api/users/signup/', () => {
        return HttpResponse.json(
          { email: ['user with this 이메일 already exists.'] },
          { status: 400 },
        )
      }),
    )

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <TestRouterWrapper />
      </MemoryRouter>,
    )

    // 1. 사용자 입력 시뮬레이션 (중복 이메일 사용)
    await user.type(screen.getByLabelText('이메일'), DUPLICATE_EMAIL)
    await user.type(screen.getByLabelText('닉네임'), '다른유저')
    await user.type(screen.getByLabelText('비밀번호'), 'password123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password123')

    // 2. '계정 생성하기' 버튼 클릭
    await user.click(screen.getByRole('button', { name: '계정 생성하기' }))

    // 3. 결과 검증
    // 에러 메시지가 화면에 표시되었는지 확인
    expect(await screen.findByText(/이메일 오류:/)).toBeInTheDocument()

    // 성공 alert는 호출되지 않았는지 확인
    expect(alertSpy).not.toHaveBeenCalled()
  })
})
