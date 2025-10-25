import React, { useState } from 'react'
import axiosInstance from '../../api/axiosInstance' // 1. axiosInstance 임포트
import { AxiosError } from 'axios'
import { type UserInfo } from './mypage.types'

interface SettingsFormProps {
  data: UserInfo | null // 2. null일 수 있음 (로딩 전)
  onWithdraw: () => void // 3. 회원 탈퇴 핸들러 prop
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  data,
  onWithdraw,
}) => {
  // 4. 비밀번호 변경 폼을 위한 내부 상태
  const [isPasswordFormVisible, setIsPasswordFormVisible] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(
    null,
  )

  // 5. 비밀번호 변경 제출 핸들러 (기존 MyPage 로직 이식)
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
      setIsPasswordFormVisible(false) // 폼 닫기
    } catch (err) {
      const axiosError = err as AxiosError
      if (axiosError.response && axiosError.response.status === 400) {
        setPasswordChangeError('현재 비밀번호가 일치하지 않습니다.')
      } else {
        setPasswordChangeError('비밀번호 변경에 실패했습니다.')
      }
    }
  }

  // 6. 데이터 로딩 전 UI
  if (!data) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-800">개인정보 설정</h3>
        <p className="text-gray-500">사용자 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">개인정보 설정</h3>
          {/* '저장' 버튼은 현재 수정 기능이 없으므로 비활성화 또는 숨김 */}
          {/* <button className="px-5 py-2 text-sm font-semibold text-white bg-indigo-500 rounded-md hover:bg-indigo-600 transition-colors">
            저장
          </button> */}
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-indigo-500 rounded-full flex items-center justify-center text-white text-5xl font-bold">
              {data.nickname.charAt(0)}
            </div>
          </div>
          <div className="flex-grow w-full space-y-4">
            {/* 7. API 데이터로 교체 ('name' -> 'nickname') */}
            <div>
              <label className="text-sm text-gray-500">이름 (닉네임)</label>
              <input
                type="text"
                value={data.nickname}
                readOnly
                className="w-full p-2 mt-1 bg-gray-100 border border-gray-200 rounded-md"
              />
            </div>
            {/* 이메일 */}
            <div>
              <label className="text-sm text-gray-500">이메일</label>
              <input
                type="email"
                value={data.email}
                readOnly
                className="w-full p-2 mt-1 bg-gray-100 border border-gray-200 rounded-md"
              />
            </div>
            {/* 'phone' 필드 제거 (API에 없음) */}

            {/* 8. API 데이터로 교체 ('joinedDate' -> 'date_joined') */}
            <div>
              <label className="text-sm text-gray-500">가입일</label>
              <input
                type="text"
                value={new Date(data.date_joined).toLocaleDateString()}
                readOnly
                className="w-full p-2 mt-1 bg-gray-100 border border-gray-200 rounded-md"
              />
            </div>

            {/* 9. 비밀번호 변경 폼 토글 버튼 */}
            <div>
              <label className="text-sm text-gray-500">비밀번호 변경</label>
              <button
                onClick={() => setIsPasswordFormVisible(!isPasswordFormVisible)}
                className="w-full mt-1 p-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                {isPasswordFormVisible ? '비밀번호 변경 닫기' : '비밀번호 변경'}
              </button>
            </div>
          </div>
        </div>

        {/* 10. 비밀번호 변경 폼 (조건부 렌더링) */}
        {isPasswordFormVisible && (
          <form
            onSubmit={handleChangePassword}
            className="mt-6 space-y-4 pt-6 border-t"
          >
            <h4 className="text-lg font-semibold text-gray-700">
              비밀번호 변경
            </h4>
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
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300"
            >
              확인
            </button>
          </form>
        )}
      </div>

      {/* 11. 회원 탈퇴 섹션 (기존 MyPage 로직 이식) */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-red-600 border-b border-red-200 pb-2">
          회원 탈퇴
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          계정을 삭제하면 모든 데이터가 영구적으로 제거됩니다. 이 작업은 되돌릴
          수 없습니다.
        </p>
        <button
          onClick={onWithdraw} // 부모로부터 받은 onWithdraw 함수 호출
          className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300"
        >
          계정 삭제하기
        </button>
      </div>
    </>
  )
}
