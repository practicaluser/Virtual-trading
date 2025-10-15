// frontend/src/pages/LoginPage.tsx
import React from 'react'
import LoginForm from '../components/Auth/LoginForm' // LoginForm 경로 조정

const LoginPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-r from-[#667eea] to-[#764ba2]">
      <div style={{ maxWidth: '450px', width: '100%' }}>
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">📈 StockSim</h1>
          <p className="text-white/80 mt-2">모의 주식 투자 플랫폼</p>
        </div>

        {/* 로그인 폼 카드 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}

export default LoginPage
