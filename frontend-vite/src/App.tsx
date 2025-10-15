import React from 'react'
// 💡 Link를 import 목록에 추가합니다.
import { Routes, Route, Link } from 'react-router-dom'

// 페이지 컴포넌트 import
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import MyPage from './pages/MyPage'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'

// Navbar 컴포넌트는 수정할 필요 없습니다.
const Navbar: React.FC = () => {
  const { authState, logout } = useAuth()
  return (
    <nav className="p-4 bg-gray-800 text-white fixed top-0 w-full z-10">
      <ul className="flex justify-center space-x-6">
        <li>
          <Link to="/" className="hover:text-indigo-400 transition-colors">
            홈
          </Link>
        </li>
        {authState.isLoggedIn ? (
          <>
            <li>
              <Link
                to="/mypage"
                className="hover:text-indigo-400 transition-colors"
              >
                마이페이지
              </Link>
            </li>
            <li>
              <button
                onClick={logout}
                className="hover:text-indigo-400 transition-colors"
              >
                로그아웃
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link
                to="/login"
                className="hover:text-indigo-400 transition-colors"
              >
                로그인
              </Link>
            </li>
            <li>
              <Link
                to="/signup"
                className="hover:text-indigo-400 transition-colors"
              >
                회원가입
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  )
}

// HomePage 컴포넌트도 수정할 필요 없습니다.
const HomePage: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-center">
    <h1 className="text-5xl font-bold mb-4">StockSim</h1>
    <p className="text-xl mb-8">
      모의 주식 투자 플랫폼에 오신 것을 환영합니다.
    </p>
    <div className="space-x-4">
      <Link
        to="/login"
        className="bg-white text-indigo-600 px-6 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
      >
        로그인
      </Link>
      <Link
        to="/signup"
        className="bg-indigo-700 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-800 transition-colors"
      >
        회원가입
      </Link>
    </div>
  </div>
)

function App() {
  return (
    // 💡 <Router>를 제거하고 Fragment(<>)로 변경합니다.
    <>
      <Navbar />
      <div className="pt-16">
        {' '}
        {/* Navbar 높이만큼 콘텐츠를 내리기 위한 패딩 */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 💡 ProtectedRoute 사용법을 올바른 v6 방식으로 수정합니다. */}
          <Route element={<ProtectedRoute />}>
            <Route path="/mypage" element={<MyPage />} />
          </Route>
        </Routes>
      </div>
    </>
  )
}

export default App
