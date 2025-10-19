import { type ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MyPage from './MyPage'
import LoginPage from './LoginPage'
import { AuthContext } from '../contexts/AuthContext'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

// 로그아웃 함수를 감시하기 위한 Mock 함수 생성
const mockLogout = vi.fn()

// 테스트를 위한 Wrapper 컴포넌트
const renderWithProviders = (ui: ReactElement) => {
  return render(
    // 테스트용 Provider. value에 실제 AuthState와 Mock 함수를 전달
    <AuthContext.Provider
      value={{
        authState: {
          isLoggedIn: true,
          accessToken: 'fake-access-token',
          refreshToken: 'fake-refresh-token',
        },
        login: vi.fn(),
        logout: mockLogout, // 실제 logout 대신 Mock 함수를 전달
      }}
    >
      <MemoryRouter initialEntries={['/mypage']}>
        <Routes>
          <Route path="/mypage" element={ui} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('MyPage', () => {
  afterEach(() => {
    vi.clearAllMocks() // 각 테스트 후 Mock 함수 초기화
  })

  test('사용자 정보를 성공적으로 불러와 화면에 표시한다', async () => {
    renderWithProviders(<MyPage />)

    // msw 핸들러가 반환하는 닉네임 "테스트유저"가 화면에 표시될 때까지 기다림
    expect(await screen.findByText('테스트유저')).toBeInTheDocument()
  })

  // test('로그아웃 버튼을 클릭하면 logout 함수를 호출하고 로그인 페이지로 이동한다', async () => {
  //   const user = userEvent.setup()

  //   // 로그아웃 API가 성공적으로 응답한다고 설정
  //   server.use(
  //     http.post('http://127.0.0.1:8000/api/users/logout/', () => {
  //       return new HttpResponse(null, { status: 205 })
  //     }),
  //   )

  //   renderWithProviders(<MyPage />)

  //   // 1. 초기 데이터가 로드될 때까지 기다림
  //   expect(await screen.findByText('테스트유저')).toBeInTheDocument()

  //   // 2. 로그아웃 버튼을 찾아 클릭
  //   const logoutButton = screen.getByRole('button', { name: '로그아웃' })
  //   await user.click(logoutButton)

  //   // 3. 결과 검증
  //   // (검증 1) AuthContext의 logout 함수가 1번 호출되었는지 확인
  //   expect(mockLogout).toHaveBeenCalledTimes(1)

  //   // (검증 2) 로그인 페이지로 성공적으로 리다이렉트되었는지 확인
  //   expect(
  //     await screen.findByRole('heading', { name: '로그인' }),
  //   ).toBeInTheDocument()
  // })
})
