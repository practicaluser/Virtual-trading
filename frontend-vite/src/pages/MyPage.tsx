import React, { useMemo } from 'react' // useState, useEffect, useCallback 제거
import axiosInstance from '../api/axiosInstance' // ✨ 회원 탈퇴(handleWithdraw)를 위해 다시 임포트
import { useAuth } from '../contexts/AuthContext'

// --- Component Imports ---
import { AssetSummary } from '../components/mypage/AssetSummary'
import { AssetHistoryChart } from '../components/mypage/AssetHistoryChart'
import { HoldingsTable } from '../components/mypage/HoldingsTable' // ✨ StockCalculations 제거됨
import { TransactionHistory } from '../components/mypage/TransactionHistory'
import { SettingsForm } from '../components/mypage/SettingsForm'
import { PendingOrdersTable } from '../components/mypage/PendingOrdersTable'

// --- Type Imports ---
import {
  type AssetSummaryData,
  type AssetHistoryData,
  // PortfolioItem, TransactionOrderItem 등은 훅 내부에서 사용
} from '../components/mypage/mypage.types'

// --- Custom Hook Import ---
import { usePortfolioData } from '../hooks/usePortfolioData' // ✨ 훅 임포트

// --- Helper Function ---
const getCurrentMonthString = (): string => {
  const month = new Date().getMonth() + 1 // getMonth()는 0부터 시작
  return `${month}월`
}

// --- MyPage Component ---
const MyPage: React.FC = () => {
  // --- Custom Hook Usage ---
  // 훅을 호출하여 필요한 모든 데이터와 상태를 가져옵니다.
  const {
    isLoading, // 데이터 로딩 상태
    error, // 에러 메시지
    userInfo, // 사용자 정보 (닉네임, 이메일 등)
    cashBalance, // 보유 현금 (AuthContext에서 옴)
    stockHoldings, // 보유 주식 목록 (실시간 데이터 포함)
    transactionHistory, // 거래 내역
    pendingOrders,
    historicalAssetHistory, // 과거 월말 자산 추이
    stockCalcs, // 계산된 주식 합계 (평가액, 손익, 수익률)
    totalAssets, // 계산된 총 자산 (주식 + 현금)
    initialAssets, // 시작 자산 (현재는 mock)
    cancelOrder,
  } = usePortfolioData()

  // AuthContext에서 logout 함수 가져오기
  const { logout } = useAuth()

  // --- Event Handler ---
  // 회원 탈퇴 함수
  const handleWithdraw = async () => {
    if (
      window.confirm(
        '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      )
    ) {
      try {
        // ✨ axiosInstance 사용
        await axiosInstance.delete('/api/users/withdraw/')
        alert('계정이 성공적으로 삭제되었습니다.')
        logout() // 로그아웃 처리
      } catch (err) {
        alert('계정 삭제에 실패했습니다. 다시 시도해주세요.')
        console.error('Withdrawal failed:', err)
      }
    }
  }

  // --- Derived State / Memoized Calculations ---
  // 최종 자산 변화 추이 데이터 조합 (과거 + 현재)
  const finalAssetHistoryData = useMemo(() => {
    if (isLoading || error) return [] // 로딩 중/에러 시 빈 배열
    const currentMonthStr = getCurrentMonthString()
    const currentMonthData: AssetHistoryData = {
      month: currentMonthStr,
      value: String(totalAssets), // 현재 총 자산 사용
    }
    // API 데이터에서 현재 달과 같은 월 데이터 제거
    const pastMonthsData = historicalAssetHistory.filter(
      (item) => item.month !== currentMonthStr,
    )
    return [...pastMonthsData, currentMonthData] // 배열 합치기
  }, [historicalAssetHistory, totalAssets, isLoading, error]) // 의존성 배열

  // --- Conditional Rendering for Loading/Error ---
  // 로딩 중 UI
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-500">데이터를 불러오는 중...</div>
      </div>
    )
  }
  // 에러 발생 UI
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    )
  }

  // --- Data Preparation for AssetSummary ---
  // AssetSummary에 전달할 데이터 객체 생성
  const totalOverallProfit = totalAssets - initialAssets // 전체 손익
  const totalOverallProfitRate = // 전체 수익률 (0 나누기 방지)
    initialAssets > 0 ? (totalOverallProfit / initialAssets) * 100 : 0

  const displayAssetSummary: AssetSummaryData = {
    totalAssets: totalAssets, // 실시간 총 자산
    totalProfit: totalOverallProfit, // 실시간 전체 손익
    totalProfitRate: totalOverallProfitRate, // 실시간 전체 수익률
    cash: cashBalance, // 실시간 보유 현금
    stockValue: stockCalcs.totalStockValue, // 실시간 주식 평가액
    initialAssets: initialAssets, // 시작 자산 (Mock)
  }

  // --- Render ---
  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* 페이지 제목 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
        </div>

        {/* 자산 요약 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AssetSummary
            data={displayAssetSummary}
            stockProfit={stockCalcs.totalStockProfit} // 주식 손익 전달
            stockProfitRate={stockCalcs.totalStockProfitRate} // 주식 수익률 전달
          />
        </div>

        {/* 자산 변화 추이 차트 */}
        <AssetHistoryChart data={finalAssetHistoryData} />

        {/* 보유 주식 테이블 (onCalculationsComplete 제거됨) */}
        <HoldingsTable data={stockHoldings} />

        {/* ✨ 미체결 주문 섹션 추가 --- */}
        <PendingOrdersTable
          orders={pendingOrders}
          onCancelOrder={cancelOrder}
          isLoading={isLoading} // 취소 중 로딩 상태 전달
        />

        {/* 거래 내역 테이블 */}
        <TransactionHistory data={transactionHistory} />

        {/* 개인정보 설정 폼 */}
        <SettingsForm data={userInfo} onWithdraw={handleWithdraw} />
      </main>
    </div>
  )
}

export default MyPage
