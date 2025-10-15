// frontend/src/pages/SignupPage.tsx
import React from 'react'
import SignupForm from '../components/Auth/SignupForm' // 추후 생성할 회원가입 폼

const SignupPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-r from-[#667eea] to-[#764ba2]">
      <div style={{ maxWidth: '450px', width: '100%' }}>
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">📈 StockSim</h1>
          <p className="text-white/80 mt-2">모의 주식 투자 플랫폼</p>
        </div>

        {/* 회원가입 폼 카드 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
            회원가입
          </h2>
          {/* 이전의 임시 텍스트를 실제 SignupForm 컴포넌트로 교체합니다. */}
          <SignupForm />
        </div>
      </div>
    </div>
  )
}

export default SignupPage
