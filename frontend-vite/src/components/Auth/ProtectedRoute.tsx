import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// React.FC 타입을 제거하여 children prop 의존성을 없앱니다.
const ProtectedRoute = () => {
  const { authState } = useAuth()

  if (!authState.isLoggedIn) {
    // 로그인 상태가 아니면 로그인 페이지로 리다이렉트
    return <Navigate to="/login" replace />
  }

  // 로그인 상태이면 자식 라우트를 렌더링하는 Outlet을 반환
  return <Outlet />
}

export default ProtectedRoute
