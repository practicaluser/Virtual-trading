import '@testing-library/jest-dom'
import { server } from './mocks/server'

// 모든 테스트 시작 전에 Mock 서버를 실행합니다.
beforeAll(() => server.listen())

// 각 테스트가 끝날 때마다 핸들러를 리셋하여 테스트 간 영향을 없앱니다.
afterEach(() => server.resetHandlers())

// 모든 테스트가 끝나면 Mock 서버를 종료합니다.
afterAll(() => server.close())
