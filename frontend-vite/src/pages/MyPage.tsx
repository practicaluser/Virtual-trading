import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../contexts/AuthContext'
import { AxiosError } from 'axios'

// API 응답 데이터의 타입을 정의
interface UserData {
  email: string
  nickname: string
  date_joined: string
}

const MyPage: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // 1. 비밀번호 변경을 위한 상태 추가
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(
    null,
  )

  const { authState, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        const response = await axiosInstance.get<UserData>('/api/users/mypage/')
        setUserData(response.data)
      } catch (err) {
        setError('사용자 정보를 불러오는 데 실패했습니다.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // 2. 비밀번호 변경 폼 제출 핸들러
  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordChangeError(null)

    if (!oldPassword || !newPassword) {
      setPasswordChangeError('모든 필드를 입력해주세요.')
      return
    }

    try {
      await axiosInstance.put('/api/users/password/change/', {
        old_password: oldPassword,
        new_password: newPassword,
      })
      alert('비밀번호가 성공적으로 변경되었습니다.')
      setOldPassword('')
      setNewPassword('')
    } catch (err) {
      const axiosError = err as AxiosError
      if (axiosError.response && axiosError.response.status === 400) {
        setPasswordChangeError('현재 비밀번호가 일치하지 않습니다.')
      } else {
        setPasswordChangeError('비밀번호 변경에 실패했습니다.')
      }
    }
  }

  // 3. 회원 탈퇴 핸들러
  const handleWithdraw = async () => {
    if (
      window.confirm(
        '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      )
    ) {
      try {
        await axiosInstance.delete('/api/users/withdraw/')
        alert('계정이 성공적으로 삭제되었습니다.')
        logout() // Context와 localStorage에서 토큰 삭제 및 상태 변경
      } catch (err) {
        alert('계정 삭제에 실패했습니다. 다시 시도해주세요.')
      }
    }
  }

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/api/users/logout/', {
        refresh: authState.refreshToken,
      })
    } catch (err) {
      console.error('로그아웃 요청 실패:', err)
    } finally {
      logout()
      navigate('/login')
    }
  }

  // 로딩 상태 - 배경 통일
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-[#667eea] to-[#764ba2]">
        <div className="text-white text-xl">로딩 중...</div>
      </div>
    )
  }

  // 에러 상태 - 배경 통일
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-[#667eea] to-[#764ba2]">
        <div className="text-white text-xl text-red-300">{error}</div>
      </div>
    )
  }

  return (
    // 배경을 홈과 동일한 그라데이션으로 변경 + Navbar와의 간격을 위해 상단 패딩 추가
    <div className="flex justify-center items-start py-28 px-4 min-h-screen bg-gradient-to-r from-[#667eea] to-[#764ba2]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center">
          마이페이지
        </h2>

        {/* 내 정보 */}
        {userData && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
              내 정보
            </h3>
            <div>
              <p className="text-sm text-gray-500">이메일</p>
              <p className="text-gray-800 font-medium">{userData.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">닉네임</p>
              <p className="text-gray-800 font-medium">{userData.nickname}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">가입일</p>
              <p className="text-gray-800 font-medium">
                {new Date(userData.date_joined).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* 비밀번호 변경 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
            비밀번호 변경
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label
                htmlFor="current-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                현재 비밀번호
              </label>
              <input
                type="password"
                id="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                새 비밀번호
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="••••••••"
              />
            </div>
            {passwordChangeError && (
              <p className="text-red-500 text-sm text-center">
                {passwordChangeError}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300"
            >
              비밀번호 변경
            </button>
          </form>
        </div>

        {/* 회원 탈퇴 */}
        <div>
          <h3 className="text-lg font-semibold text-red-600 border-b border-red-200 pb-2">
            회원 탈퇴
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            계정을 삭제하면 모든 데이터가 영구적으로 제거됩니다. 이 작업은
            되돌릴 수 없습니다.
          </p>
          <button
            onClick={handleWithdraw}
            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300"
          >
            계정 삭제하기
          </button>
        </div>

        {/* 로그아웃 버튼 */}
        <div>
          <button
            onClick={handleLogout}
            className="w-full mt-8 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}

export default MyPage
