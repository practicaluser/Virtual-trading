import { render, screen } from '@testing-library/react'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

test('renders home page elements', () => {
  // 💡 App 컴포넌트를 BrowserRouter와 AuthProvider로 감싸서 렌더링합니다.
  render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>,
  )

  // 'StockSim' 이라는 텍스트가 있는지 확인
  const titleElement = screen.getByText(/Ascend Capital/i)
  expect(titleElement).toBeInTheDocument()

  // 환영 메시지가 있는지 확인
  const welcomeMessage = screen.getByText(
    /모의 주식 투자 플랫폼에 오신 것을 환영합니다./i,
  )
  expect(welcomeMessage).toBeInTheDocument()
})
