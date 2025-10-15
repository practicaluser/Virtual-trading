import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.tsx' // AuthProvider import

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {' '}
        {/* App 컴포넌트를 AuthProvider로 감싸줍니다. */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
