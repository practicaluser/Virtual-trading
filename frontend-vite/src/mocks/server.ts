import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// 모든 핸들러를 사용하여 테스트 서버를 설정합니다.
export const server = setupServer(...handlers)
