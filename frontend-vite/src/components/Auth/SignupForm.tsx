import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../../api/axiosInstance'
import { AxiosError } from 'axios'

// 백엔드 에러 응답 타입을 명확하게 정의
interface SignupErrorResponse {
  email?: string[]
  nickname?: string[]
}

const SignupForm: React.FC = () => {
  const [email, setEmail] = useState<string>('')
  const [nickname, setNickname] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)

    try {
      await axiosInstance.post('/api/users/signup/', {
        email,
        nickname,
        password,
      })

      alert('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.')
      navigate('/login')
    } catch (err) {
      // AxiosError의 제네릭에 위에서 정의한 타입을 넣어줍니다.
      const axiosError = err as AxiosError<SignupErrorResponse>
      if (axiosError.response && axiosError.response.data) {
        const errorData = axiosError.response.data
        if (errorData.email) {
          setError(`이메일 오류: ${errorData.email[0]}`)
        } else if (errorData.nickname) {
          setError(`닉네임 오류: ${errorData.nickname[0]}`)
        } else {
          setError('알 수 없는 오류가 발생했습니다.')
        }
      } else {
        setError('서버에 연결할 수 없습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="signup-email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          이메일
        </label>
        <input
          type="email"
          id="signup-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="form-input w-full px-4 py-2 border border-gray-300 rounded-lg"
          placeholder="your@email.com"
        />
      </div>
      <div>
        <label
          htmlFor="signup-nickname"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          닉네임
        </label>
        <input
          type="text"
          id="signup-nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
          className="form-input w-full px-4 py-2 border border-gray-300 rounded-lg"
          placeholder="사용할 닉네임"
        />
      </div>
      <div>
        <label
          htmlFor="signup-password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          비밀번호
        </label>
        <input
          type="password"
          id="signup-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="form-input w-full px-4 py-2 border border-gray-300 rounded-lg"
          placeholder="••••••••"
        />
      </div>
      <div>
        <label
          htmlFor="signup-confirm-password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          비밀번호 확인
        </label>
        <input
          type="password"
          id="signup-confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        {loading ? '처리 중...' : '계정 생성하기'}
      </button>
    </form>
  )
}

export default SignupForm
