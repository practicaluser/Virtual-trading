import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../../api/axiosInstance'
import { AxiosError } from 'axios'
import { useAuth } from '../../contexts/AuthContext'

// 로그인 에러 응답 타입을 명확하게 정의
interface LoginErrorResponse {
  detail: string
}

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.post('/api/users/login/', {
        email,
        password,
      })
      const { access, refresh } = response.data
      login({ access, refresh })
      navigate('/')
    } catch (err) {
      // AxiosError의 제네릭에 위에서 정의한 타입을 넣어줍니다.
      const axiosError = err as AxiosError<LoginErrorResponse>
      if (axiosError.response && axiosError.response.status === 401) {
        setError('이메일 또는 비밀번호가 일치하지 않습니다.')
      } else {
        setError('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center">로그인</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            이메일
          </label>
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            비밀번호
          </label>
          <input
            type="password"
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="form-input w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 disabled:bg-indigo-400"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}

export default LoginForm
