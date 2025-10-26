import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios' // AxiosResponse 추가

// ... (CustomInternalAxiosRequestConfig, isRefreshing, failedQueue, processQueue 정의는 동일)
interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}
let isRefreshing = false
let failedQueue: {
  resolve: (value: string | null) => void
  reject: (reason?: unknown) => void
}[] = []
const processQueue = (error: unknown | null, token: string | null = null) => {
  // [로그] 큐 처리 시작
  console.log(
    `[Axios Interceptor] Processing queue with ${
      error ? 'error' : `token: ${token?.substring(0, 10)}...`
    }. Queue size: ${failedQueue.length}`,
  )
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

const axiosInstance = axios.create({
  // 👇 [수정] 이 부분을 환경 변수로 변경합니다.
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터
axiosInstance.interceptors.request.use(
  (config: CustomInternalAxiosRequestConfig) => {
    // 타입 명시
    // [로그] 요청 시작
    console.log(`[Axios Request] ${config.method?.toUpperCase()} ${config.url}`)
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    console.error('[Axios Request Error]', error)
    return Promise.reject(error)
  },
)

// 응답 인터셉터
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // 타입 명시
    // [로그] 응답 성공
    console.log(
      `[Axios Response Success] ${response.config.method?.toUpperCase()} ${
        response.config.url
      } Status: ${response.status}`,
    )
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomInternalAxiosRequestConfig
    // [로그] 응답 에러 발생
    console.warn(
      `[Axios Response Error] ${originalRequest?.method?.toUpperCase()} ${
        originalRequest?.url
      } Status: ${error.response?.status}`,
      error,
    )

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url !== '/api/users/login/refresh/'
    ) {
      // [로그] 401 감지, 갱신 시도
      console.log(
        `[Axios Interceptor] Detected 401 for ${originalRequest.url}. Attempting refresh...`,
      )

      if (isRefreshing) {
        // [로그] 이미 갱신 중, 큐에 추가
        console.log(
          `[Axios Interceptor] Refresh already in progress. Adding ${originalRequest.url} to queue.`,
        )
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string | null) => resolve(token),
            reject,
          })
        })
          .then((token) => {
            if (typeof token === 'string') {
              // [로그] 큐에서 나와 재시도
              console.log(
                `[Axios Interceptor] Resuming ${originalRequest.url} from queue with new token.`,
              )
              originalRequest.headers['Authorization'] = `Bearer ${token}`
              return axiosInstance(originalRequest)
            } else {
              console.warn(
                `[Axios Interceptor] Refresh failed for queued request ${originalRequest.url}.`,
              )
              return Promise.reject(error)
            }
          })
          .catch((err) => {
            console.error(
              `[Axios Interceptor] Error resuming ${originalRequest.url} from queue.`,
              err,
            )
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true // 갱신 시작
      // [로그] 갱신 시작
      console.log('[Axios Interceptor] Starting token refresh...')

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) {
          console.error('[Axios Interceptor] No refresh token found.')
          throw new Error('No refresh token available.')
        }

        // [로그] Refresh API 호출 전
        console.log('[Axios Interceptor] Calling /api/users/login/refresh/...')
        const res = await axios.post<{ access: string }>(
          `${axiosInstance.defaults.baseURL}/api/users/login/refresh/`,
          { refresh: refreshToken },
        )
        const newAccessToken = res.data.access
        // [로그] Refresh API 성공
        console.log(
          `[Axios Interceptor] Token refresh SUCCESS. New token: ${newAccessToken.substring(
            0,
            10,
          )}...`,
        )

        localStorage.setItem('accessToken', newAccessToken)
        axiosInstance.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${newAccessToken}`
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`

        processQueue(null, newAccessToken) // 큐 처리 (성공)

        // [로그] 원래 요청 재시도
        console.log(
          `[Axios Interceptor] Retrying original request ${originalRequest.url} with new token...`,
        )
        return axiosInstance(originalRequest)
      } catch (refreshError: unknown) {
        // [로그] Refresh API 실패
        console.error('[Axios Interceptor] Token refresh FAILED.', refreshError)
        processQueue(refreshError, null) // 큐 처리 (실패)

        console.error('Refresh token is invalid or refresh failed.')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        // window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        // [로그] 갱신 종료
        console.log('[Axios Interceptor] Token refresh process finished.')
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default axiosInstance
