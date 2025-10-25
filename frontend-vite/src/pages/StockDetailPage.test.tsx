import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import StockDetailPage from './StockDetailPage'

// window.alert 함수를 모킹합니다.
const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

// 테스트 래퍼 컴포넌트 (라우터 설정)
const renderPage = (stockCode: string) => {
  return render(
    <MemoryRouter initialEntries={[`/stock/${stockCode}`]}>
      <Routes>
        <Route path="/stock/:stockCode" element={<StockDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('StockDetailPage - Trading Flow', () => {
  // 각 테스트 전에 alert mock을 초기화합니다.
  beforeEach(() => {
    alertMock.mockClear()
  })

  test('성공: 매수 버튼 클릭 -> 모달 열기 -> 수량 입력 -> 주문 -> 성공 알림', async () => {
    const user = userEvent.setup()
    renderPage('005930')

    // 1. "삼성전자" 헤더(페이지)가 로드될 때까지 기다립니다.
    await screen.findByRole('heading', { name: '삼성전자' })

    // 2. StockHeader의 '매수' 버튼을 클릭합니다.
    // (findAll...[0] 사용: 모달 탭에도 '매수'가 있으므로 헤더의 첫 번째 버튼을 찾음)
    const headerBuyButton = (
      await screen.findAllByRole('button', { name: '매수' })
    )[0]
    await user.click(headerBuyButton)

    // 3. '주문구분' 레이블이 화면에 나타날 때까지 기다립니다. (모달이 열렸다는 증거)
    const orderTypeSelect = await screen.findByLabelText('주문구분')
    expect(orderTypeSelect).toBeInTheDocument()

    // 4. 수량 입력란에 '10'을 입력합니다. (레이블 텍스트 "주문수량" - 공백 없음)
    const quantityInput = screen.getByLabelText('주문수량')
    await user.clear(quantityInput)
    await user.type(quantityInput, '10')

    // 5. 모달의 '매수 주문' 버튼을 클릭합니다. (고유한 이름)
    const modalSubmitButton = screen.getByRole('button', { name: '매수 주문' })
    await user.click(modalSubmitButton)

    // 6. "매수가 완료되었습니다." 알림이 떴는지 확인합니다.
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('매수가 완료되었습니다.')
    })

    // 7. 모달이 닫혔는지 확인합니다. ('주문구분' 레이블이 사라졌는지 확인)
    await waitFor(() => {
      expect(screen.queryByLabelText('주문구분')).not.toBeInTheDocument()
    })
  })

  test('실패: 매수 주문 시 "예수금이 부족합니다." 알림', async () => {
    const user = userEvent.setup()
    renderPage('005930')
    await screen.findByRole('heading', { name: '삼성전자' })

    const headerBuyButton = (
      await screen.findAllByRole('button', { name: '매수' })
    )[0]
    await user.click(headerBuyButton)

    // 3. 모달 확인 ('주문구분' 레이블로)
    const orderTypeSelect = await screen.findByLabelText('주문구분')

    // 4. "예수금 부족"을 트리거하는 수량 '9999'를 입력합니다.
    const quantityInput = screen.getByLabelText('주문수량')
    await user.clear(quantityInput)
    await user.type(quantityInput, '9999')

    // 5. 모달 '매수 주문' 버튼 클릭
    const modalSubmitButton = screen.getByRole('button', { name: '매수 주문' })
    await user.click(modalSubmitButton)

    // 6. "예수금이 부족합니다." 알림을 확인합니다.
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('예수금이 부족합니다.')
    })

    // 7. (중요) 모달이 닫히지 *않고* '주문구분' 레이블이 그대로 있는지 확인합니다.
    expect(orderTypeSelect).toBeInTheDocument()
  })

  test('성공: 매도 버튼 클릭 -> 모달 열기 -> 수량 입력 -> 주문 -> 성공 알림', async () => {
    const user = userEvent.setup()
    renderPage('005930')
    await screen.findByRole('heading', { name: '삼성전자' })

    // 2. StockHeader의 '매도' 버튼을 클릭합니다.
    const headerSellButton = (
      await screen.findAllByRole('button', { name: '매도' })
    )[0]
    await user.click(headerSellButton)

    // 3. '주문구분' 레이블로 모달이 열렸는지 확인합니다.
    const orderTypeSelect = await screen.findByLabelText('주문구분')
    expect(orderTypeSelect).toBeInTheDocument()

    // 4. 수량 입력란에 '5'를 입력합니다.
    const quantityInput = screen.getByLabelText('주문수량')
    await user.clear(quantityInput)
    await user.type(quantityInput, '5')

    // 5. 모달의 '매도 주문' 버튼을 클릭합니다. (고유한 이름)
    const modalSubmitButton = screen.getByRole('button', { name: '매도 주문' })
    await user.click(modalSubmitButton)

    // 6. "매도가 완료되었습니다." 알림이 떴는지 확인합니다.
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('매도가 완료되었습니다.')
    })

    // 7. 모달이 닫혔는지 확인합니다. ('주문구분' 레이블이 사라졌는지)
    await waitFor(() => {
      expect(screen.queryByLabelText('주문구분')).not.toBeInTheDocument()
    })
  })

  test('실패: 매도 주문 시 "보유 수량이 부족합니다." 알림', async () => {
    const user = userEvent.setup()
    renderPage('005930')
    await screen.findByRole('heading', { name: '삼성전자' })

    const headerSellButton = (
      await screen.findAllByRole('button', { name: '매도' })
    )[0]
    await user.click(headerSellButton)

    // 3. 모달 확인 ('주문구분' 레이블로)
    const orderTypeSelect = await screen.findByLabelText('주문구분')

    // 4. 실패 트리거 수량 입력
    const quantityInput = screen.getByLabelText('주문수량')
    await user.clear(quantityInput)
    await user.type(quantityInput, '8888')

    // 5. 모달 '매도 주문' 버튼 클릭
    const modalSubmitButton = screen.getByRole('button', { name: '매도 주문' })
    await user.click(modalSubmitButton)

    // 6. 알림 확인
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('보유 수량이 부족합니다.')
    })

    // 7. 실패 시 모달은 닫히지 않아야 함
    expect(orderTypeSelect).toBeInTheDocument()
  })

  test('실패: 매도 주문 시 (보유수량 0) "보유 수량이 부족합니다." 알림', async () => {
    const user = userEvent.setup()
    renderPage('005930')
    await screen.findByRole('heading', { name: '삼성전자' })

    const headerSellButton = (
      await screen.findAllByRole('button', { name: '매도' })
    )[0]
    await user.click(headerSellButton)

    // 3. 모달 확인
    const orderTypeSelect = await screen.findByLabelText('주문구분')

    // 4. 수량 '1' 입력
    const quantityInput = screen.getByLabelText('주문수량')
    await user.clear(quantityInput)
    await user.type(quantityInput, '1')

    // 5. 모달 '매도 주문' 버튼 클릭
    const modalSubmitButton = screen.getByRole('button', { name: '매도 주문' })
    await user.click(modalSubmitButton)

    // 6. 알림 확인
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('보유 수량이 부족합니다.')
    })

    // 7. 실패 시 모달이 닫히지 않고 남아있는지 확인
    expect(orderTypeSelect).toBeInTheDocument()
  })

  test('성공: 지정가 매수 주문 -> "접수" 알림', async () => {
    const user = userEvent.setup()
    renderPage('005930')
    await screen.findByRole('heading', { name: '삼성전자' })

    // 1. 헤더 '매수' 버튼 클릭
    const headerBuyButton = (
      await screen.findAllByRole('button', { name: '매수' })
    )[0]
    await user.click(headerBuyButton)

    // 2. 모달 열림 확인 ('주문구분' 레이블로)
    const priceTypeSelect = await screen.findByLabelText('주문구분')

    // 3. 주문구분이 '지정가'인지 확인 (기본값)
    expect(priceTypeSelect).toHaveValue('LIMIT')

    // 4. 수량 '10' 입력
    const quantityInput = screen.getByLabelText('주문수량')
    await user.clear(quantityInput)
    await user.type(quantityInput, '10')

    // 5. (신규) 주문가격 '85000' 입력 (레이블 "주문가격" - 공백 없음)
    const priceInput = screen.getByLabelText('주문가격')
    await user.clear(priceInput)
    await user.type(priceInput, '85000')

    // 6. 모달의 '매수 주문' 버튼 클릭
    const modalSubmitButton = screen.getByRole('button', { name: '매수 주문' })
    await user.click(modalSubmitButton)

    // 7. (신규) "접수" 알림 확인
    await waitFor(() => {
      // StockDetailPage.tsx의 handleOrderSubmit 로직에 따라
      // '매수가 완료되었습니다.' 알림이 뜨는 것이 맞습니다.
      // 만약 "접수" 알림을 별도로 처리했다면 그 텍스트로 수정하세요.
      expect(alertMock).toHaveBeenCalledWith('매수가 완료되었습니다.')

      /* // 만약 백엔드가 '지정가'일 때 다른 응답을 주도록 수정했다면 아래 코드를 사용하세요.
      // (현재 StockDetailPage.tsx 코드는 지정가/시장가 구분 없이 '완료' 알림을 띄웁니다)
       expect(alertMock).toHaveBeenCalledWith(
         '지정가 매수 주문이 접수되었습니다. (체결 대기)',
       )
      */
    })

    // 8. 모달 닫힘 확인 ('주문구분' 레이블이 사라졌는지)
    await waitFor(() => {
      expect(screen.queryByLabelText('주문구분')).not.toBeInTheDocument()
    })
  })

  test('실패: 지정가 주문 시 가격 0원 입력 -> UI 유효성 검사 알림', async () => {
    const user = userEvent.setup()
    renderPage('005930')
    await screen.findByRole('heading', { name: '삼성전자' })

    // 1. 헤더 '매수' 버튼 클릭
    const headerBuyButton = (
      await screen.findAllByRole('button', { name: '매수' })
    )[0]
    await user.click(headerBuyButton)

    // 2. 모달 열림 확인
    const priceTypeSelect = await screen.findByLabelText('주문구분')

    // 3. '지정가' 확인 및 수량 입력
    expect(priceTypeSelect).toHaveValue('LIMIT')
    await user.type(screen.getByLabelText('주문수량'), '5')

    // 4. (신규) 유효하지 않은 가격 '0' 입력
    const priceInput = screen.getByLabelText('주문가격')
    await user.clear(priceInput)
    await user.type(priceInput, '0')

    // 5. 모달의 '매수 주문' 버튼 클릭
    const modalSubmitButton = screen.getByRole('button', { name: '매수 주문' })
    await user.click(modalSubmitButton)

    // 6. (신규) 프론트엔드 유효성 검사 알림 확인 (OrderModal.tsx의 handleSubmit 로직)
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        '지정가 주문 가격을 올바르게 입력해주세요.',
      )
    })

    // 7. (중요) 모달이 닫히지 *않았는지* 확인
    expect(priceTypeSelect).toBeInTheDocument()
  })
})
