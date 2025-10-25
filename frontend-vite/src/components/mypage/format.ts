/**
 * 숫자를 "1,234원" 형식의 문자열로 변환합니다.
 * null, undefined, NaN 값이 들어와도 앱이 멈추지 않도록 처리합니다.
 */
export const formatCurrency = (amount: number | null | undefined) => {
  // 1. amount가 숫자가 아니거나(null, undefined), NaN인지 확인합니다.
  if (typeof amount !== 'number' || isNaN(amount)) {
    // 2. 0원 대신 '-'을 반환하여 데이터가 없음을 명확히 합니다.
    return '- 원'
  }

  // 3. 유효한 숫자인 경우에만 toLocaleString을 호출합니다.
  return `${amount.toLocaleString()}원`
}
