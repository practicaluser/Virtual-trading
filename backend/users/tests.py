from datetime import date, timedelta
from decimal import Decimal
from io import StringIO  # For capturing command output
from unittest.mock import call, patch  # call 추가

# users/tests.py 상단 import 영역에 추가
import pandas as pd  # pykrx 모의 객체(DataFrame) 생성을 위해
from django.contrib.auth import get_user_model
from django.core.management import call_command  # For testing command
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

import users.management.commands.record_asset_snapshot as snapshot_module
from stocks.models import Stock  # Need Stock model
from trading.models import Portfolio  # Need Portfolio model
from users.management.commands.record_asset_snapshot import (
    Command,  # 테스트할 커맨드 클래스 직접 임포트
)

from .models import AssetHistory, User


class UserAuthAPITests(APITestCase):

    def setUp(self):
        """테스트 시작 전에 공통적으로 사용할 데이터를 설정합니다."""
        self.signup_url = reverse("signup")
        self.login_url = reverse("token_obtain_pair")
        self.refresh_url = reverse("token_refresh")
        self.mypage_url = reverse("mypage")
        self.logout_url = reverse("logout")

        self.user_data = {
            "email": "testuser@example.com",
            "nickname": "testnickname",
            "password": "testpassword123",
        }
        # 테스트를 위한 사용자 미리 생성
        self.user = User.objects.create_user(**self.user_data)

    def test_signup_success(self):
        """1. 회원가입 성공 테스트"""
        print("1. 회원가입 성공 테스트 시작")
        data = {
            "email": "newuser@example.com",
            "nickname": "newnickname",
            "password": "newpassword123",
        }
        response = self.client.post(self.signup_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email=data["email"]).exists())
        print("-> 통과")

    def test_signup_fail_duplicate_email(self):
        """2. 중복 이메일 회원가입 실패 테스트"""
        print("2. 중복 이메일 회원가입 실패 테스트 시작")
        response = self.client.post(self.signup_url, self.user_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        print("-> 통과")

    def test_login_success_and_get_tokens(self):
        """3. 로그인 성공 및 토큰 발급 테스트"""
        print("3. 로그인 성공 및 토큰 발급 테스트 시작")
        login_data = {
            "email": self.user_data["email"],
            "password": self.user_data["password"],
        }
        response = self.client.post(self.login_url, login_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        print("-> 통과")

    def test_login_fail_wrong_password(self):
        """4. 잘못된 비밀번호 로그인 실패 테스트"""
        print("4. 잘못된 비밀번호 로그인 실패 테스트 시작")
        login_data = {"email": self.user_data["email"], "password": "wrongpassword"}
        response = self.client.post(self.login_url, login_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        print("-> 통과")

    def test_mypage_access_with_token(self):
        """5. 인증된 사용자의 마이페이지 접근 테스트"""
        print("5. 인증된 사용자의 마이페이지 접근 테스트 시작")
        # 먼저 로그인하여 토큰을 얻음
        login_response = self.client.post(
            self.login_url,
            {"email": self.user_data["email"], "password": self.user_data["password"]},
            format="json",
        )
        access_token = login_response.data["access"]

        # 헤더에 Access Token을 포함하여 요청
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get(self.mypage_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user_data["email"])
        print("-> 통과")

    def test_mypage_access_without_token(self):
        """6. 미인증 사용자의 마이페이지 접근 실패 테스트"""
        print("6. 미인증 사용자의 마이페이지 접근 실패 테스트 시작")
        response = self.client.get(self.mypage_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        print("-> 통과")

    def test_logout_and_blacklist_token(self):
        """7. 로그아웃 (토큰 블랙리스트) 테스트"""
        print("7. 로그아웃 (토큰 블랙리스트) 테스트 시작")
        # 로그인하여 토큰 발급
        login_response = self.client.post(
            self.login_url,
            {"email": self.user_data["email"], "password": self.user_data["password"]},
            format="json",
        )
        access_token = login_response.data["access"]
        refresh_token = login_response.data["refresh"]

        # 로그아웃 요청
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_response = self.client.post(
            self.logout_url, {"refresh": refresh_token}, format="json"
        )
        self.assertEqual(logout_response.status_code, status.HTTP_205_RESET_CONTENT)

        # 블랙리스트에 등록된 리프레시 토큰으로 재발급 시도
        refresh_response = self.client.post(
            self.refresh_url, {"refresh": refresh_token}, format="json"
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)
        print("-> 통과")


# --- [신규] Asset History Tests ---
class AssetHistoryTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            nickname="testuser",
            password="password123",
            cash_balance=Decimal("10000000.00"),
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            nickname="otheruser",
            password="password123",
            cash_balance=Decimal("5000000.00"),
        )
        self.client.force_authenticate(user=self.user)

        self.stock_samsung = Stock.objects.create(
            stock_code="005930", stock_name="삼성전자"
        )
        self.stock_sk = Stock.objects.create(
            stock_code="000660", stock_name="SK하이닉스"
        )

        # Create some history data for testing GET API
        today = timezone.now().date()
        self.history1 = AssetHistory.objects.create(
            user=self.user,
            snapshot_date=today - timedelta(days=60),
            total_asset=Decimal("9000000.00"),
        )
        self.history2 = AssetHistory.objects.create(
            user=self.user,
            snapshot_date=today - timedelta(days=30),
            total_asset=Decimal("9500000.00"),
        )
        self.history3 = AssetHistory.objects.create(
            user=self.user, snapshot_date=today, total_asset=Decimal("10000000.00")
        )
        # Data for another user (should not be returned)
        AssetHistory.objects.create(
            user=self.other_user, snapshot_date=today, total_asset=Decimal("5000000.00")
        )

        self.asset_history_url = reverse("asset-history")

    def test_get_asset_history_success(self):
        """[성공] GET /api/users/asset-history/"""
        response = self.client.get(self.asset_history_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should return 3 records for the authenticated user, ordered by date
        self.assertEqual(len(response.data), 3)
        self.assertEqual(
            response.data[0]["month"], f"{self.history1.snapshot_date.month}월"
        )
        self.assertEqual(Decimal(response.data[0]["value"]), Decimal("9000000.00"))
        self.assertEqual(
            response.data[1]["month"], f"{self.history2.snapshot_date.month}월"
        )
        self.assertEqual(Decimal(response.data[1]["value"]), Decimal("9500000.00"))
        self.assertEqual(
            response.data[2]["month"], f"{self.history3.snapshot_date.month}월"
        )
        self.assertEqual(Decimal(response.data[2]["value"]), Decimal("10000000.00"))

    def test_get_asset_history_unauthenticated(self):
        """[실패] 인증 없이 자산 기록 API 접근"""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.asset_history_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Management Command/Task Logic Test ---
    @patch.object(
        snapshot_module, "get_current_stock_price_for_trading"
    )  # 모듈 레벨 함수 패치
    @patch.object(
        snapshot_module.Command, "is_last_trading_day_of_month"
    )  # Command 클래스의 메서드 패치
    @patch.object(
        timezone, "now"
    )  # timezone.now 패치 (모듈이 아닌 django.utils.timezone 객체 사용)
    def test_record_asset_snapshot_command(
        self, mock_now, mock_is_last_day, mock_get_price
    ):
        """[성공] Management Command 로직 테스트"""
        # --- Mocking Setup ---
        test_date = date(2025, 10, 31)  # Assume today is the last trading day
        mock_now.return_value = timezone.make_aware(
            timezone.datetime.combine(test_date, timezone.datetime.min.time())
        )
        mock_is_last_day.return_value = True  # Simulate it's the last trading day

        # Define mock prices
        def mock_price_logic(stock_code):
            if stock_code == "005930":
                return Decimal("80000.00")
            if stock_code == "000660":
                return Decimal("150000.00")
            return None

        mock_get_price.side_effect = mock_price_logic

        # --- Test Data Setup ---
        # User 1: 10M cash, 10 Samsung shares
        Portfolio.objects.create(
            user=self.user,
            stock=self.stock_samsung,
            total_quantity=10,
            average_purchase_price=Decimal("70000"),
        )
        # User 2: 5M cash, 5 SK Hynix shares
        Portfolio.objects.create(
            user=self.other_user,
            stock=self.stock_sk,
            total_quantity=5,
            average_purchase_price=Decimal("100000"),
        )
        # User 3: No portfolio, just cash
        user3 = User.objects.create_user(
            email="user3@e.com",
            nickname="user3",
            password="pw",
            cash_balance=Decimal("1000"),
        )

        # --- Execute Command ---
        out = StringIO()  # Capture command's print output
        call_command("record_asset_snapshot", stdout=out)

        # --- Assertions ---
        # 1. Check if AssetHistory was created/updated for user 1
        history_user1 = AssetHistory.objects.get(
            user=self.user, snapshot_date=test_date
        )
        # Total Asset = Cash (10M) + Stock Value (10 * 80,000 = 800,000) = 10,800,000
        self.assertEqual(history_user1.total_asset, Decimal("10800000.00"))

        # 2. Check if AssetHistory was created/updated for user 2
        history_user2 = AssetHistory.objects.get(
            user=self.other_user, snapshot_date=test_date
        )
        # Total Asset = Cash (5M) + Stock Value (5 * 150,000 = 750,000) = 5,750,000
        self.assertEqual(history_user2.total_asset, Decimal("5750000.00"))

        # 3. Check if AssetHistory was created/updated for user 3 (only cash)
        history_user3 = AssetHistory.objects.get(user=user3, snapshot_date=test_date)
        # Total Asset = Cash (1000) + Stock Value (0) = 1000
        self.assertEqual(history_user3.total_asset, Decimal("1000.00"))

        # 4. Check command output (optional)
        self.assertIn("자산 스냅샷 기록 완료", out.getvalue())

    @patch.object(snapshot_module.Command, "is_last_trading_day_of_month")
    def test_record_asset_snapshot_command_not_last_day(self, mock_is_last_day):
        """[성공] 마지막 거래일이 아닐 때 커맨드가 실행되지 않는지 확인"""
        mock_is_last_day.return_value = False  # Simulate it's NOT the last trading day

        # Store current count
        initial_count = AssetHistory.objects.count()

        out = StringIO()
        call_command("record_asset_snapshot", stdout=out)

        # Verify no new records were created
        self.assertEqual(AssetHistory.objects.count(), initial_count)
        self.assertIn(
            "마지막 거래일이 아니므로", out.getvalue()
        )  # Check output message

    # [추가] 'handle' 메서드의 가격 조회 실패 테스트
    @patch.object(
        snapshot_module, "get_current_stock_price_for_trading"
    )  # 모듈 레벨 함수 패치
    @patch.object(
        snapshot_module.Command, "is_last_trading_day_of_month"
    )  # Command 클래스의 메서드 패치
    @patch.object(timezone, "now")  # timezone.now 패치
    def test_record_asset_snapshot_handle_price_error(
        self, mock_now, mock_is_last_day, mock_get_price
    ):
        """
        [handle] (예외) 스냅샷 기록 중 일부 주식의 가격 조회에 실패하는 경우
        """
        print("\n[TEST] test_record_asset_snapshot_handle_price_error")
        # --- Mocking Setup ---
        test_date = date(2025, 10, 31)
        mock_now.return_value = timezone.make_aware(
            timezone.datetime.combine(test_date, timezone.datetime.min.time())
        )
        mock_is_last_day.return_value = True  # 마지막 거래일이라고 가정

        # 가격 조회 시, '000660'(SK하이닉스)만 에러 발생시킴
        def mock_price_logic(stock_code):
            if stock_code == "005930":
                return Decimal("80000.00")
            if stock_code == "000660":
                raise ConnectionError("Test Naver Connection Error")
            return None

        mock_get_price.side_effect = mock_price_logic

        # --- Test Data Setup ---
        # self.user (Cash 10M) - 삼성전자 10주 보유 (성공)
        Portfolio.objects.create(
            user=self.user,
            stock=self.stock_samsung,
            total_quantity=10,
            average_purchase_price=Decimal("70000"),
        )
        # self.other_user (Cash 5M) - SK하이닉스 5주 보유 (실패)
        Portfolio.objects.create(
            user=self.other_user,
            stock=self.stock_sk,
            total_quantity=5,
            average_purchase_price=Decimal("100000"),
        )

        # --- Execute Command ---
        out = StringIO()
        # stdout=out, stderr=out: 표준 출력과 표준 에러를 모두 캡처
        call_command("record_asset_snapshot", stdout=out, stderr=out)

        # --- Assertions ---
        # 1. user1 (삼성전자) : 정상적으로 자산 계산
        # 자산 = 현금(10M) + 주식(10 * 80,000 = 800,000) = 10,800,000
        history_user1 = AssetHistory.objects.get(
            user=self.user, snapshot_date=test_date
        )
        self.assertEqual(history_user1.total_asset, Decimal("10800000.00"))

        # 2. user2 (SK하이닉스) : 주식 가치 0으로 계산 (에러 발생)
        # 자산 = 현금(5M) + 주식(0) = 5,000,000
        history_user2 = AssetHistory.objects.get(
            user=self.other_user, snapshot_date=test_date
        )
        self.assertEqual(history_user2.total_asset, Decimal("5000000.00"))

        # 3. 커맨드 최종 출력에 '오류 발생'이 포함되었는지 확인
        self.assertIn("자산 스냅샷 기록 완료", out.getvalue())

        self.assertNotIn("오류 발생", out.getvalue())


# --- 2. 'is_last_trading_day_of_month' 메서드 자체를 테스트하는 새 클래스 추가 ---


class RecordAssetSnapshotMethodTest(TestCase):
    """
    record_asset_snapshot 커맨드의
    'is_last_trading_day_of_month' 메서드 로직을 직접 테스트합니다.
    (pykrx 라이브러리를 모킹)
    """

    def setUp(self):
        self.command = Command()

    @patch("pykrx.stock.get_market_ohlcv_by_date")
    def test_is_last_trading_day_of_month_true(self, mock_pykrx):
        """[Method] (성공) 오늘이 마지막 거래일인 경우 True 반환"""
        print("\n[TEST] test_is_last_trading_day_of_month_true")
        # 1. Setup: 10월 31일이 마지막 거래일인 상황 가정
        test_date = date(2025, 10, 31)  # 금요일

        # pykrx가 반환할 가짜 DataFrame (pandas 객체)
        mock_df = pd.DataFrame(
            {"종가": [100, 200]},
            index=pd.to_datetime(["2025-10-30", "2025-10-31"]),
        )
        mock_pykrx.return_value = mock_df

        # 2. Action
        result = self.command.is_last_trading_day_of_month(test_date)

        # 3. Assert
        self.assertTrue(result)
        # pykrx가 올바른 월 범위(10월 1일 ~ 10월 31일)로 호출되었는지 확인
        mock_pykrx.assert_called_once_with(
            fromdate="20251001", todate="20251031", ticker="005930"
        )

    @patch("pykrx.stock.get_market_ohlcv_by_date")
    def test_is_last_trading_day_of_month_false(self, mock_pykrx):
        """[Method] (실패) 오늘이 마지막 거래일이 아닌 경우 False 반환"""
        print("\n[TEST] test_is_last_trading_day_of_month_false")
        # 1. Setup: 10월 30일에 실행했으나, 31일이 마지막 거래일인 상황
        test_date = date(2025, 10, 30)  # 목요일

        mock_df = pd.DataFrame(
            {"종가": [100, 200]},
            index=pd.to_datetime(["2025-10-30", "2025-10-31"]),
        )
        mock_pykrx.return_value = mock_df

        # 2. Action
        result = self.command.is_last_trading_day_of_month(test_date)

        # 3. Assert
        self.assertFalse(result)

    @patch("pykrx.stock.get_market_ohlcv_by_date")
    def test_is_last_trading_day_of_month_pykrx_error(self, mock_pykrx):
        """[Method] (예외) pykrx가 에러를 발생시키는 경우 False 반환"""
        print("\n[TEST] test_is_last_trading_day_of_month_pykrx_error")
        # 1. Setup
        test_date = date(2025, 10, 31)
        mock_pykrx.side_effect = Exception("PYKRX Network Error")

        # 2. Action
        result = self.command.is_last_trading_day_of_month(test_date)

        # 3. Assert
        self.assertFalse(result)  # 에러 발생 시 안전하게 False 반환

    @patch("pykrx.stock.get_market_ohlcv_by_date")
    def test_is_last_trading_day_of_month_empty_df(self, mock_pykrx):
        """[Method] (예외) 해당 월에 거래일이 없어 빈 DataFrame 반환 시 False"""
        print("\n[TEST] test_is_last_trading_day_of_month_empty_df")
        # 1. Setup
        test_date = date(2025, 10, 31)
        mock_pykrx.return_value = pd.DataFrame()  # 비어있는 DataFrame

        # 2. Action
        result = self.command.is_last_trading_day_of_month(test_date)

        # 3. Assert
        self.assertFalse(result)  # df.empty == True
