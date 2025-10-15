import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { AuthContext, AuthProvider } from '../../contexts/AuthContext'
import LoginPage from '../../pages/LoginPage'

// 테스트를 위한 Wrapper 컴포넌트 생성
const renderWithRouterAndAuth = (isLoggedIn: boolean) => {
  // 테스트 케이스에 따라 로그인 상태를 명시적으로 주입
  const authState = {
    isLoggedIn,
    accessToken: isLoggedIn ? 'fake-token' : null,
    refreshToken: isLoggedIn ? 'fake-token' : null,
  }

  return render(
    <AuthContext.Provider
      value={{ authState, login: vi.fn(), logout: vi.fn() }}
    >
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>보호된 콘텐츠</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  test('로그인한 사용자는 보호된 페이지에 접근할 수 있다', () => {
    renderWithRouterAndAuth(true) // 로그인 상태로 렌더링
    expect(screen.getByText('보호된 콘텐츠')).toBeInTheDocument()
  })

  test('로그인하지 않은 사용자는 로그인 페이지로 리다이렉트된다', () => {
    renderWithRouterAndAuth(false) // 로그아웃 상태로 렌더링
    expect(screen.queryByText('보호된 콘텐츠')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
  })
})
