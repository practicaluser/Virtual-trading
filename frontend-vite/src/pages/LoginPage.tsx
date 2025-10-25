// // frontend/src/pages/LoginPage.tsx
// import React from 'react'
// import LoginForm from '../components/Auth/LoginForm' // LoginForm 경로 조정

// const LoginPage: React.FC = () => {
//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-r from-[#667eea] to-[#764ba2]">
//       <div style={{ maxWidth: '450px', width: '100%' }}>
//         {/* 로고 */}
//         <div className="text-center mb-8">
//           <h1 className="text-4xl font-bold text-white">📈 StockSim</h1>
//           <p className="text-white/80 mt-2">모의 주식 투자 플랫폼</p>
//         </div>

//         {/* 로그인 폼 카드 */}
//         <div className="bg-white rounded-2xl shadow-2xl p-8">
//           <LoginForm />
//         </div>
//       </div>
//     </div>
//   )
// }

// export default LoginPage

// src/pages/LoginPage.tsx
import React from 'react'
import LoginForm from '../components/Auth/LoginForm'

const LoginPage: React.FC = () => {
  return (
    <div className="flex h-screen">
      {/* 왼쪽: [변경점 1] - relative로 하단 로고의 기준점 설정 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden">
        {/* [변경점 2]: 메인 콘텐츠 래퍼 */}
        {/* flex, justify-center, items-center로 내부 콘텐츠를 수직/수평 중앙 정렬 */}
        {/* w-full h-full을 주어 왼쪽 화면 전체를 차지하게 함 */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full h-full p-12 text-white">
          {/* 메인 콘텐츠 블록 (이 블록 자체가 중앙 정렬됨) */}
          {/* 내부 텍스트는 기본값인 왼쪽 정렬 유지 */}
          <div>
            <h1 className="text-5xl font-bold leading-tight">
              주식 투자의 시작,
              <br />
              <span>Ascend Capital</span>
            </h1>
            <p className="mt-6 text-lg text-gray-200">
              실전과 동일한 환경에서 안전하게 투자 연습을 시작하세요.
              <br />
              실시간 시세와 다양한 투자 도구를 무료로 제공합니다.
            </p>

            <ul className="mt-10 space-y-4">
              {[
                '실시간 주식 시세 조회',
                '가상 자금으로 안전한 투자 연습',
                '상세한 포트폴리오 분석',
                '거래 내역 및 수익률 추적',
              ].map((text, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <svg
                    className="w-6 h-6 text-indigo-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{text} </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* [변경점 3]: 하단 로고 */}
        {/* absolute, bottom-0, left-0, right-0로 하단에 고정하고 가로로 꽉 채움 */}
        {/* p-12는 좌우/하단 여백을 위함 */}
        <div className="absolute z-10 bottom-0 left-0 right-0 p-12">
          {/* [변경점 4]: 현업 선호도 (중앙 정렬) */}
          {/* justify-center를 추가하여 텍스트를 중앙 정렬 */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
            <span>Powered by</span>
            <span className="font-semibold text-indigo-300">
              Ascend Capital
            </span>
          </div>
        </div>
      </div>

      {/* 오른쪽: 로그인 폼 (기존과 동일) */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md">
          {/* 로고 (모바일에서도 보이게) */}
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-3xl font-bold text-gray-900">
              📈 Ascend Capital
            </h1>
            <p className="text-gray-600 mt-1">모의 주식 투자 플랫폼</p>
          </div>

          {/* 로그인 폼 카드 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
