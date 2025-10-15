import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

// 1. Context에서 관리할 상태의 타입 정의
interface AuthState {
  isLoggedIn: boolean
  accessToken: string | null
  refreshToken: string | null
}

// 2. Context가 제공할 값의 타입 정의 (상태 + 함수)
interface AuthContextType {
  authState: AuthState
  login: (tokens: { access: string; refresh: string }) => void
  logout: () => void
}

// 3. Context 생성 (초기값은 undefined)
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 4. Provider 컴포넌트 생성
interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    accessToken: null,
    refreshToken: null,
  })

  // 컴포넌트가 처음 마운트될 때 localStorage를 확인하여 로그인 상태를 복원
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    if (accessToken && refreshToken) {
      setAuthState({
        isLoggedIn: true,
        accessToken,
        refreshToken,
      })
    }
  }, [])

  // 로그인 처리 함수
  const login = (tokens: { access: string; refresh: string }) => {
    localStorage.setItem('accessToken', tokens.access)
    localStorage.setItem('refreshToken', tokens.refresh)
    setAuthState({
      isLoggedIn: true,
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
    })
  }

  // 로그아웃 처리 함수
  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setAuthState({
      isLoggedIn: false,
      accessToken: null,
      refreshToken: null,
    })
  }

  const value = {
    authState,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// 5. Context를 쉽게 사용하기 위한 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
