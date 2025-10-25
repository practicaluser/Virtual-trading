import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import axiosInstance from '../api/axiosInstance'
import { AxiosError } from 'axios' // AxiosError 임포트

// --- 타입 정의 (동일) ---
interface AuthState {
  isLoggedIn: boolean
  accessToken: string | null
  refreshToken: string | null
}
interface AuthContextType {
  authState: AuthState
  login: (tokens: { access: string; refresh: string }) => Promise<void>
  logout: () => void
  cashBalance: number
  fetchUserBalance: () => Promise<void>
}

// --- Context 생성 (동일) ---
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// --- Provider Props (동일) ---
interface AuthProviderProps {
  children: ReactNode
}

// --- AuthProvider 컴포넌트 (로그 추가) ---
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    accessToken: null,
    refreshToken: null,
  })
  const [cashBalance, setCashBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true) // 초기 로딩 상태

  // --- 로그아웃 함수 ---
  const logout = () => {
    // [로그] 로그아웃 시작
    console.log('[AuthContext] Logging out...')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setAuthState({
      isLoggedIn: false,
      accessToken: null,
      refreshToken: null,
    })
    setCashBalance(0) // 예수금 초기화
    // [로그] 로그아웃 완료
    console.log('[AuthContext] Logout complete. Auth state reset.')
  }

  // --- 예수금 조회 함수 ---
  const fetchUserBalance = async () => {
    // [로그] 예수금 조회 시작
    console.log(
      '[AuthContext] Attempting to fetch user balance (/api/users/mypage/)...',
    )
    try {
      const response = await axiosInstance.get('/api/users/mypage/')
      // [로그] 예수금 조회 성공
      const balance = response.data?.cash_balance
      console.log(
        `[AuthContext] Fetch user balance SUCCESS. Raw cash_balance from API: ${balance}`,
        response.data,
      )

      if (balance !== undefined && balance !== null) {
        const parsedBalance = parseFloat(balance)
        setCashBalance(parsedBalance)
        // [로그] 예수금 상태 업데이트
        console.log(
          `[AuthContext] Cash balance state updated to: ${parsedBalance}`,
        )
      } else {
        console.warn(
          '[AuthContext] cash_balance not found or is null/undefined in API response.',
        )
      }
    } catch (error) {
      const axiosError = error as AxiosError // 타입 단언
      // [로그] 예수금 조회 실패
      console.warn(
        `[AuthContext] Fetch user balance FAILED. Status: ${axiosError.response?.status}`,
        error,
      )

      // 401 에러 시 logout 호출 제거됨 (인터셉터가 처리)
      if (axiosError.response?.status !== 401) {
        console.error(
          '[AuthContext] Non-401 error during fetchUserBalance. Consider logging out if critical.',
          error,
        )
        // logout(); // 필요 시 주석 해제
      }
      // 401 에러는 인터셉터에게 맡기고, 에러를 다시 던져서 호출한 쪽(initAuth, login)에서 알 수 있도록 함
      throw error
    }
  }

  // --- 앱 시작 시 초기 인증 및 예수금 조회 ---
  useEffect(() => {
    const initAuth = async () => {
      // [로그] 초기 인증 시작
      console.log('[AuthContext] Initializing auth (useEffect)...')
      setIsLoading(true) // 로딩 시작 명시
      const accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')

      if (accessToken && refreshToken) {
        // [로그] 로컬 스토리지에서 토큰 발견
        console.log(
          '[AuthContext] Tokens found in localStorage. Restoring auth state.',
        )
        setAuthState({
          isLoggedIn: true,
          accessToken,
          refreshToken,
        })
        try {
          // [로그] 초기 예수금 조회 시도
          console.log('[AuthContext] Attempting initial fetchUserBalance...')
          await fetchUserBalance()
          // [로그] 초기 예수금 조회 성공 (fetchUserBalance 내부 로그 참조)
        } catch (fetchError) {
          // [로그] 초기 예수금 조회 최종 실패 (갱신 포함)
          console.error(
            '[AuthContext] Initial fetchUserBalance ultimately FAILED (may include refresh failure).',
            fetchError,
          )
          // 여기서 logout()을 호출할 수 있지만, 인터셉터에서 이미 처리했을 가능성 높음
          // logout();
        }
      } else {
        // [로그] 로컬 스토리지에 토큰 없음
        console.log(
          '[AuthContext] No tokens found in localStorage. User is logged out.',
        )
      }
      setIsLoading(false)
      // [로그] 초기 인증 종료
      console.log('[AuthContext] Auth initialization finished.')
    }

    initAuth()
  }, []) // 빈 배열: 앱 시작 시 1회만 실행

  // --- 로그인 함수 ---
  const login = async (tokens: { access: string; refresh: string }) => {
    // [로그] 로그인 시작
    console.log('[AuthContext] Logging in...')
    localStorage.setItem('accessToken', tokens.access)
    localStorage.setItem('refreshToken', tokens.refresh)
    setAuthState({
      isLoggedIn: true,
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
    })
    try {
      // [로그] 로그인 후 예수금 조회 시도
      console.log('[AuthContext] Attempting fetchUserBalance after login...')
      await fetchUserBalance()
      // [로그] 로그인 후 예수금 조회 성공 (fetchUserBalance 내부 로그 참조)
    } catch (loginFetchError) {
      // [로그] 로그인 후 예수금 조회 실패
      console.error(
        '[AuthContext] fetchUserBalance FAILED after login.',
        loginFetchError,
      )
      // 로그인 직후 실패는 문제가 있을 수 있으므로 로그아웃 처리 고려
      // logout();
    }
    // [로그] 로그인 완료
    console.log('[AuthContext] Login process complete.')
  }

  // --- 로딩 게이트 ---
  if (isLoading) {
    // [로그] 초기 로딩 중 UI 표시
    // console.log('[AuthContext] Rendering loading state...') // 너무 자주 찍힐 수 있어 주석 처리
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-500">사용자 정보 확인 중...</div>
      </div>
    )
  }

  // --- Context 값 제공 ---
  const value = {
    authState,
    login,
    logout,
    cashBalance,
    fetchUserBalance,
  }

  // [로그] Provider 렌더링
  // console.log('[AuthContext] Rendering Provider with value:', value) // 너무 자주 찍힐 수 있어 주석 처리
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// --- useAuth 훅 (동일) ---
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
