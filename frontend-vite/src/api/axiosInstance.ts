import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

// _retry 속성을 포함하는 커스텀 타입 정의
interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const axiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터: 모든 요청에 Access Token을 자동으로 추가합니다.
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 응답 인터셉터: Access Token 만료(401 에러) 시 자동으로 재발급을 시도합니다.
axiosInstance.interceptors.response.use(
  // 1. 정상적인 응답은 그대로 반환합니다.
  (response) => {
    return response
  },
  // 2. 에러가 발생한 응답을 처리합니다.
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomInternalAxiosRequestConfig

    // 401 에러이고, 재시도한 요청이 아니며, 로그인 요청이 아닐 경우에만 실행합니다.
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url !== '/api/users/login/'
    ) {
      originalRequest._retry = true // 무한 재시도를 방지하기 위해 플래그 설정

      try {
        // localStorage에서 Refresh Token을 가져옵니다.
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) {
          // Refresh Token이 없으면 로그인 페이지로 보냅니다.
          console.error('No refresh token available.')
          window.location.href = '/login'
          return Promise.reject(error)
        }

        // 토큰 재발급 API를 호출합니다. (인터셉터를 타지 않도록 axios 직접 사용)
        const res = await axios.post(
          'http://127.0.0.1:8000/api/users/login/refresh/',
          {
            refresh: refreshToken,
          },
        )

        const newAccessToken = res.data.access

        // 새로 발급받은 Access Token을 localStorage에 저장합니다.
        localStorage.setItem('accessToken', newAccessToken)

        // 기본 헤더 및 실패했던 원래 요청의 헤더를 새 토큰으로 교체합니다.
        axiosInstance.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${newAccessToken}`
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`

        // 원래 실패했던 요청을 다시 실행합니다.
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        // Refresh Token마저 유효하지 않은 경우 (재발급 실패)
        console.error('Refresh token is invalid. Redirecting to login.')

        // 기존 토큰 정보를 모두 삭제합니다.
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')

        // 로그인 페이지로 리다이렉트시킵니다.
        window.location.href = '/login'

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default axiosInstance
