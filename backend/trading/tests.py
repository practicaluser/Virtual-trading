# backend/trading/tests.py

from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch  # MagicMock 추가 (필요시 사용)

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone  # For timestamp comparison
from rest_framework import status
from rest_framework.test import APITestCase

from stocks.models import Stock

from .models import Order, Portfolio, Transaction
from .tasks import process_pending_limit_orders

# users 앱의 AssetHistory 모델도 임포트 (setUp에서 사용 가능성 고려)
# from users.models import AssetHistory


User = get_user_model()


def find_order_by_id(order_list, order_id):
    """주어진 리스트에서 ID가 일치하는 주문 딕셔너리를 찾습니다."""
    return next((order for order in order_list if order["id"] == order_id), None)


class TradingAPITests(APITestCase):

    def setUp(self):
        # 사용자 생성
        self.user = User.objects.create_user(
            email="test@example.com",
            nickname="testuser",
            password="password123",
            cash_balance=Decimal("10000000.00"),  # 천만원
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            nickname="otheruser",
            password="password123",
            cash_balance=Decimal("5000000.00"),  # 오백만원
        )

        # 기본 사용자 인증 설정
        self.client.force_authenticate(user=self.user)

        # 테스트용 주식 생성
        self.stock_samsung = Stock.objects.create(
            stock_code="005930", stock_name="삼성전자", market_type="KOSPI"
        )
        self.stock_sk = Stock.objects.create(
            stock_code="000660", stock_name="SK하이닉스", market_type="KOSPI"
        )
        self.stock_naver = Stock.objects.create(
            stock_code="035420", stock_name="NAVER", market_type="KOSPI"
        )

        # 기본 사용자의 초기 포트폴리오 설정 (삼성전자 10주 보유)
        self.portfolio_samsung = Portfolio.objects.create(
            user=self.user,
            stock=self.stock_samsung,
            total_quantity=10,
            average_purchase_price=Decimal("70000.00"),
        )
        # 다른 사용자의 포트폴리오 (테스트 격리 확인용)
        Portfolio.objects.create(
            user=self.other_user,
            stock=self.stock_naver,
            total_quantity=5,
            average_purchase_price=Decimal("200000.00"),
        )

        # API URL 정의
        self.order_url = reverse("order-list-create")  # POST/GET /api/trading/orders/
        self.portfolio_url = reverse("portfolio-list")  # GET /api/trading/portfolio/
        self.pending_orders_url = reverse(
            "pending-order-list"
        )  # GET /api/trading/orders/pending/
        self.cancel_order_url_template = "order-cancel"  # URL name

    # --- 1. 시장가(MARKET) 주문 테스트 ---

    @patch("trading.serializers.get_current_stock_price_for_trading")
    def test_buy_new_stock_market_success(self, mock_get_price):
        """[성공] 시장가 매수 - 신규 (SK하이닉스)"""
        mock_get_price.return_value = Decimal("150000.00")
        data = {
            "stock": "000660",
            "order_type": "BUY",
            "quantity": 10,
            "price_type": "MARKET",
        }
        response = self.client.post(self.order_url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Order.StatusType.COMPLETED)
        self.assertEqual(response.data["executed_price"], Decimal("150000.00"))
        self.assertEqual(response.data["total_amount"], Decimal("1500000.00"))
        self.assertIsNotNone(response.data["transaction_timestamp"])

        self.user.refresh_from_db()
        self.assertEqual(self.user.cash_balance, Decimal("8500000.00"))  # 10M - 1.5M
        portfolio_sk = Portfolio.objects.get(user=self.user, stock=self.stock_sk)
        self.assertEqual(portfolio_sk.total_quantity, 10)
        self.assertEqual(portfolio_sk.average_purchase_price, Decimal("150000.00"))
        self.assertTrue(
            Transaction.objects.filter(order_id=response.data["id"]).exists()
        )

    @patch("trading.serializers.get_current_stock_price_for_trading")
    def test_buy_existing_stock_market_success(self, mock_get_price):
        """[성공] 시장가 매수 - 기존 보유 (삼성전자, 평단가 조절)"""
        mock_get_price.return_value = Decimal("60000.00")
        data = {
            "stock": "005930",
            "order_type": "BUY",
            "quantity": 10,
            "price_type": "MARKET",
        }
        response = self.client.post(self.order_url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Order.StatusType.COMPLETED)

        self.portfolio_samsung.refresh_from_db()
        self.assertEqual(self.portfolio_samsung.total_quantity, 20)  # 10 + 10
        self.assertEqual(
            self.portfolio_samsung.average_purchase_price, Decimal("65000.00")
        )

        self.user.refresh_from_db()
        self.assertEqual(self.user.cash_balance, Decimal("9400000.00"))  # 10M - 0.6M

    @patch("trading.serializers.get_current_stock_price_for_trading")
    def test_sell_partial_stock_market_success(self, mock_get_price):
        """[성공] 시장가 매도 - 일부 (삼성전자)"""
        mock_get_price.return_value = Decimal("80000.00")  # 70k에 샀던 것
        data = {
            "stock": "005930",
            "order_type": "SELL",
            "quantity": 5,
            "price_type": "MARKET",
        }
        response = self.client.post(self.order_url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Order.StatusType.COMPLETED)
        self.assertEqual(response.data["executed_price"], Decimal("80000.00"))
        self.assertEqual(response.data["total_amount"], Decimal("400000.00"))
        self.assertIsNotNone(response.data["transaction_timestamp"])

        self.portfolio_samsung.refresh_from_db()
        self.assertEqual(self.portfolio_samsung.total_quantity, 5)  # 10 - 5
        self.assertEqual(
            self.portfolio_samsung.average_purchase_price, Decimal("70000.00")
        )  # 평단가 불변

        self.user.refresh_from_db()
        self.assertEqual(self.user.cash_balance, Decimal("10400000.00"))  # 10M + 0.4M

    @patch("trading.serializers.get_current_stock_price_for_trading")
    def test_sell_all_stock_market_success(self, mock_get_price):
        """[성공] 시장가 매도 - 전부 (삼성전자, 포트폴리오 삭제)"""
        mock_get_price.return_value = Decimal("80000.00")
        data = {
            "stock": "005930",
            "order_type": "SELL",
            "quantity": 10,
            "price_type": "MARKET",
        }
        response = self.client.post(self.order_url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Order.StatusType.COMPLETED)

        self.assertFalse(
            Portfolio.objects.filter(user=self.user, stock=self.stock_samsung).exists()
        )  # 삭제 확인
        self.user.refresh_from_db()
        self.assertEqual(self.user.cash_balance, Decimal("10800000.00"))  # 10M + 0.8M

    @patch("trading.serializers.get_current_stock_price_for_trading")
    def test_buy_fail_market_insufficient_funds(self, mock_get_price):
        """[실패] 시장가 매수 - 예수금 부족"""
        mock_get_price.return_value = Decimal("1000001.00")
        data = {
            "stock": "000660",
            "order_type": "BUY",
            "quantity": 10,
            "price_type": "MARKET",
        }
        response = self.client.post(self.order_url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # [수정됨] 문자열 대신 에러 코드를 검사
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0].code, "invalid")

        # DB 롤백 확인
        self.user.refresh_from_db()
        self.assertEqual(self.user.cash_balance, Decimal("10000000.00"))
        self.assertFalse(
            Portfolio.objects.filter(user=self.user, stock=self.stock_sk).exists()
        )
        order = Order.objects.get(user=self.user, stock=self.stock_sk)
        self.assertEqual(order.status, Order.StatusType.FAILED)

    @patch("trading.serializers.get_current_stock_price_for_trading")
    def test_sell_fail_market_insufficient_shares(self, mock_get_price):
        """[실패] 시장가 매도 - 보유 수량 부족"""
        mock_get_price.return_value = Decimal("80000.00")
        data = {
            "stock": "005930",
            "order_type": "SELL",
            "quantity": 11,
            "price_type": "MARKET",
        }
        response = self.client.post(self.order_url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # [수정됨] 문자열 대신 에러 코드를 검사
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0].code, "invalid")

    @patch("trading.serializers.get_current_stock_price_for_trading")
    def test_sell_fail_market_stock_not_owned(self, mock_get_price):
        """[실패] 시장가 매도 - 보유하지 않은 주식"""
        mock_get_price.return_value = Decimal("150000.00")
        data = {
            "stock": "000660",
            "order_type": "SELL",
            "quantity": 1,
            "price_type": "MARKET",
        }
        response = self.client.post(self.order_url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # [수정됨] 문자열 대신 에러 코드를 검사
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0].code, "invalid")

    # --- 2. 지정가(LIMIT) 주문 테스트 ---

    def test_limit_buy_success_pending(self):
        """[성공] 지정가 매수 주문 (PENDING 상태로 생성)"""
        data = {
            "stock": "000660",
            "order_type": "BUY",
            "quantity": 5,
            "price_type": "LIMIT",
            "limit_price": 100000.00,
        }
        response = self.client.post(self.order_url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Order.StatusType.PENDING)
        self.assertEqual(response.data["stock"]["stock_code"], "000660")
        self.assertEqual(response.data["limit_price"], "100000.00")
        self.assertIsNone(response.data["executed_price"])
        self.assertIsNone(response.data["total_amount"])
        self.assertIsNone(response.data["transaction_timestamp"])

        self.user.refresh_from_db()
        self.assertEqual(self.user.cash_balance, Decimal("10000000.00"))
        self.assertFalse(
            Portfolio.objects.filter(user=self.user, stock=self.stock_sk).exists()
        )
        self.assertFalse(
            Transaction.objects.filter(order_id=response.data["id"]).exists()
        )

    def test_limit_sell_success_pending(self):
        """[성공] 지정가 매도 주문 (PENDING 상태로 생성)"""
        data = {
            "stock": "005930",
            "order_type": "SELL",
            "quantity": 8,
            "price_type": "LIMIT",
            "limit_price": 90000.00,
        }  # 10주 보유 중
        response = self.client.post(self.order_url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Order.StatusType.PENDING)
        self.assertEqual(response.data["limit_price"], "90000.00")
        self.assertIsNone(response.data["executed_price"])

        self.user.refresh_from_db()
        self.assertEqual(self.user.cash_balance, Decimal("10000000.00"))
        self.portfolio_samsung.refresh_from_db()
        self.assertEqual(self.portfolio_samsung.total_quantity, 10)
        self.assertFalse(
            Transaction.objects.filter(order_id=response.data["id"]).exists()
        )

    def test_limit_buy_fail_validation_insufficient_funds(self):
        """[실패] 지정가 매수 - 예수금 부족 (Validate 단계)"""
        data = {
            "stock": "005930",
            "order_type": "BUY",
            "quantity": 100,
            "price_type": "LIMIT",
            "limit_price": 100001.00,
        }
        response = self.client.post(self.order_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # [수정됨] 문자열 대신 에러 코드를 검사
        self.assertIn("non_field_errors", response.data)
        self.assertEqual(response.data["non_field_errors"][0].code, "invalid")

    def test_limit_sell_fail_validation_insufficient_shares(self):
        """[실패] 지정가 매도 - 보유 수량 부족 (Validate 단계)"""
        data = {
            "stock": "005930",
            "order_type": "SELL",
            "quantity": 11,
            "price_type": "LIMIT",
            "limit_price": 90000.00,
        }
        response = self.client.post(self.order_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # [수정됨] 문자열 대신 에러 코드를 검사
        self.assertIn("non_field_errors", response.data)
        self.assertEqual(response.data["non_field_errors"][0].code, "invalid")

    def test_limit_order_fail_missing_limit_price(self):
        """[실패] 지정가 주문 - limit_price 누락"""
        data = {
            "stock": "005930",
            "order_type": "BUY",
            "quantity": 1,
            "price_type": "LIMIT",
        }
        response = self.client.post(self.order_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # [수정됨] 문자열 대신 에러 코드를 검사
        self.assertIn("non_field_errors", response.data)
        self.assertEqual(response.data["non_field_errors"][0].code, "invalid")

    # --- 3. API 실패 및 응답 테스트 ---

    @patch("trading.serializers.get_current_stock_price_for_trading")
    def test_buy_fail_market_api_connection_error(self, mock_get_price):
        """[실패] 시장가 매수 - 크롤링(API) 실패 시"""
        mock_get_price.side_effect = ConnectionError("네이버 금융 서버 요청 실패")
        data = {
            "stock": "000660",
            "order_type": "BUY",
            "quantity": 1,
            "price_type": "MARKET",
        }
        response = self.client.post(self.order_url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # [수정됨] .string 및 hasattr 제거, str(e)로만 확인
        self.assertIsInstance(response.data, list)
        self.assertTrue(
            any("네이버 금융 서버 요청 실패" in str(e) for e in response.data)
        )

        # 실패 주문 기록 확인
        order = Order.objects.get(user=self.user, stock=self.stock_sk)
        self.assertEqual(order.status, Order.StatusType.FAILED)

    # --- 4. 주문 목록 (GET /api/trading/orders/) 테스트 ---

    @patch("trading.serializers.get_current_stock_price_for_trading")
    def test_get_order_list_includes_execution_details(self, mock_get_price):
        mock_get_price.return_value = Decimal("160000.00")

        # 1. 주문 생성
        buy_res = self.client.post(
            self.order_url,
            {
                "stock": "000660",
                "order_type": "BUY",
                "quantity": 5,
                "price_type": "MARKET",
            },
        )
        limit_res = self.client.post(
            self.order_url,
            {
                "stock": "005930",
                "order_type": "SELL",
                "quantity": 2,
                "price_type": "LIMIT",
                "limit_price": 80000.00,
            },
        )
        failed_order = Order.objects.create(
            user=self.user,
            stock=self.stock_naver,
            order_type="BUY",
            quantity=1,
            price_type="MARKET",
            status=Order.StatusType.FAILED,
        )

        # 2. 목록 조회
        response = self.client.get(self.order_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 3)

        # 3. ID를 사용하여 각 주문 데이터 찾기 및 검증 (Helper 함수 사용)
        completed_order_data = find_order_by_id(response.data, buy_res.data["id"])
        pending_order_data = find_order_by_id(response.data, limit_res.data["id"])
        failed_order_data = find_order_by_id(response.data, failed_order.id)

        self.assertIsNotNone(completed_order_data)
        self.assertIsNotNone(pending_order_data)
        self.assertIsNotNone(failed_order_data)

        # - Completed 검증
        self.assertEqual(completed_order_data["stock"]["stock_code"], "000660")
        self.assertEqual(completed_order_data["status"], Order.StatusType.COMPLETED)
        self.assertEqual(
            Decimal(completed_order_data["executed_price"]), Decimal("160000.00")
        )
        self.assertEqual(
            Decimal(completed_order_data["total_amount"]), Decimal("800000.00")
        )
        self.assertIsNotNone(completed_order_data["transaction_timestamp"])

        # - Pending 검증
        self.assertEqual(pending_order_data["stock"]["stock_code"], "005930")
        self.assertEqual(pending_order_data["status"], Order.StatusType.PENDING)
        self.assertEqual(pending_order_data["limit_price"], "80000.00")  # 문자열 비교
        self.assertIsNone(pending_order_data["executed_price"])

        # - Failed 검증
        self.assertEqual(failed_order_data["stock"]["stock_code"], "035420")
        self.assertEqual(failed_order_data["status"], Order.StatusType.FAILED)
        self.assertIsNone(failed_order_data["executed_price"])

    # --- 5. 포트폴리오 (GET /api/trading/portfolio/) 테스트 ---

    @patch("trading.serializers.get_current_stock_price_for_trading")
    def test_get_portfolio_api_success_multiple_items(self, mock_get_price):
        def mock_price_logic(stock_code):
            if stock_code == "005930":
                return Decimal("80000.00")
            if stock_code == "035420":
                return Decimal("260000.00")
            return Decimal("0.00")

        mock_get_price.side_effect = mock_price_logic

        Portfolio.objects.create(
            user=self.user,
            stock=self.stock_naver,
            total_quantity=2,
            average_purchase_price=Decimal("250000.00"),
        )

        response = self.client.get(self.portfolio_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        samsung_data = next(
            item for item in response.data if item["stock"]["stock_code"] == "005930"
        )
        naver_data = next(
            item for item in response.data if item["stock"]["stock_code"] == "035420"
        )

        # 삼성전자 데이터 검증
        self.assertEqual(samsung_data["total_quantity"], 10)
        self.assertEqual(samsung_data["average_purchase_price"], "70000.00")  # 문자열
        self.assertEqual(Decimal(samsung_data["current_price"]), Decimal("80000.00"))
        self.assertEqual(Decimal(samsung_data["total_value"]), Decimal("800000.00"))
        self.assertEqual(Decimal(samsung_data["profit_loss"]), Decimal("100000.00"))
        self.assertAlmostEqual(
            Decimal(samsung_data["profit_loss_rate"]), Decimal("14.285714"), places=6
        )

        # NAVER 데이터 검증
        self.assertEqual(naver_data["total_quantity"], 2)
        self.assertEqual(naver_data["average_purchase_price"], "250000.00")  # 문자열
        self.assertEqual(Decimal(naver_data["current_price"]), Decimal("260000.00"))
        self.assertEqual(Decimal(naver_data["total_value"]), Decimal("520000.00"))
        self.assertEqual(Decimal(naver_data["profit_loss"]), Decimal("20000.00"))
        self.assertAlmostEqual(
            Decimal(naver_data["profit_loss_rate"]), Decimal("4.0"), places=6
        )

    # --- 6. 인증 테스트 ---

    def test_trading_apis_require_authentication(self):
        """[실패] 인증 없이 거래 API 접근"""
        self.client.force_authenticate(user=None)  # 로그아웃

        response_post = self.client.post(self.order_url, {})
        response_get_orders = self.client.get(self.order_url)
        response_get_portfolio = self.client.get(self.portfolio_url)

        self.assertEqual(response_post.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response_get_orders.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response_get_portfolio.status_code, status.HTTP_401_UNAUTHORIZED
        )

    # --- 7. 미체결 주문 목록 및 취소 테스트 ---

    def test_get_pending_order_list_success(self):
        """[성공] 미체결(PENDING) 주문 목록 조회"""
        # 1. 다양한 상태의 주문 생성
        pending_order1 = Order.objects.create(
            user=self.user,
            stock=self.stock_sk,
            order_type="BUY",
            quantity=1,
            price_type="LIMIT",
            limit_price=Decimal("100000"),
            status=Order.StatusType.PENDING,
        )
        pending_order2 = Order.objects.create(
            user=self.user,
            stock=self.stock_naver,
            order_type="SELL",
            quantity=2,
            price_type="LIMIT",
            limit_price=Decimal("200000"),
            status=Order.StatusType.PENDING,
        )
        Order.objects.create(
            user=self.user,
            stock=self.stock_samsung,
            order_type="BUY",
            quantity=1,
            price_type="MARKET",
            status=Order.StatusType.COMPLETED,
        )
        Order.objects.create(
            user=self.other_user,
            stock=self.stock_samsung,
            order_type="BUY",
            quantity=1,
            price_type="LIMIT",
            limit_price=Decimal("70000"),
            status=Order.StatusType.PENDING,
        )

        # 2. 미체결 목록 API 호출
        response = self.client.get(self.pending_orders_url)

        # 3. 결과 검증
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        returned_ids = {order["id"] for order in response.data}
        expected_ids = {pending_order1.id, pending_order2.id}
        self.assertEqual(returned_ids, expected_ids)
        for order_data in response.data:
            self.assertEqual(order_data["status"], Order.StatusType.PENDING)

    def test_get_pending_order_list_no_pending(self):
        """[성공] 미체결 주문이 없을 경우 빈 목록 반환"""
        Order.objects.create(
            user=self.user,
            stock=self.stock_samsung,
            order_type="BUY",
            quantity=1,
            price_type="MARKET",
            status=Order.StatusType.COMPLETED,
        )

        response = self.client.get(self.pending_orders_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)  # 빈 리스트 []

    def test_cancel_pending_order_success(self):
        """[성공] PENDING 상태의 주문 취소"""
        order_to_cancel = Order.objects.create(
            user=self.user,
            stock=self.stock_sk,
            order_type="BUY",
            quantity=1,
            price_type="LIMIT",
            limit_price=Decimal("100000"),
            status=Order.StatusType.PENDING,
        )
        order_id = order_to_cancel.id
        cancel_url = reverse(
            self.cancel_order_url_template, kwargs={"order_id": order_id}
        )

        response = self.client.post(cancel_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], order_id)
        self.assertEqual(response.data["status"], Order.StatusType.CANCELED)

        order_to_cancel.refresh_from_db()
        self.assertEqual(order_to_cancel.status, Order.StatusType.CANCELED)

    def test_cancel_order_fail_not_pending(self):
        """[실패] PENDING 상태가 아닌 주문 취소 시도 (COMPLETED)"""
        completed_order = Order.objects.create(
            user=self.user,
            stock=self.stock_samsung,
            order_type="BUY",
            quantity=1,
            price_type="MARKET",
            status=Order.StatusType.COMPLETED,
        )
        Transaction.objects.create(
            user=self.user,
            stock=self.stock_samsung,
            order=completed_order,
            transaction_type="BUY",
            quantity=1,
            executed_price=Decimal("75000"),
        )

        order_id = completed_order.id
        cancel_url = reverse(
            self.cancel_order_url_template, kwargs={"order_id": order_id}
        )

        response = self.client.post(cancel_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("취소할 수 없는 주문", str(response.data))

        completed_order.refresh_from_db()
        self.assertEqual(completed_order.status, Order.StatusType.COMPLETED)

    def test_cancel_order_fail_not_owner(self):
        """[실패] 다른 사용자의 PENDING 주문 취소 시도"""
        other_user_order = Order.objects.create(
            user=self.other_user,
            stock=self.stock_sk,
            order_type="BUY",
            quantity=1,
            price_type="LIMIT",
            limit_price=Decimal("100000"),
            status=Order.StatusType.PENDING,
        )
        order_id = other_user_order.id
        cancel_url = reverse(
            self.cancel_order_url_template, kwargs={"order_id": order_id}
        )

        response = self.client.post(cancel_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("취소할 수 없는 주문", str(response.data))

        other_user_order.refresh_from_db()
        self.assertEqual(other_user_order.status, Order.StatusType.PENDING)

    def test_cancel_order_fail_not_exist(self):
        """[실패] 존재하지 않는 주문 ID로 취소 시도"""
        non_existent_order_id = 99999
        cancel_url = reverse(
            self.cancel_order_url_template, kwargs={"order_id": non_existent_order_id}
        )

        response = self.client.post(cancel_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("취소할 수 없는 주문", str(response.data))  # 동일한 메시지 사용

    def test_pending_list_and_cancel_apis_require_authentication(self):
        """[실패] 인증 없이 미체결 목록/취소 API 접근"""
        self.client.force_authenticate(user=None)  # 로그아웃

        response_get_pending = self.client.get(self.pending_orders_url)
        self.assertEqual(response_get_pending.status_code, status.HTTP_401_UNAUTHORIZED)

        cancel_url = reverse(self.cancel_order_url_template, kwargs={"order_id": 1})
        response_post_cancel = self.client.post(cancel_url)
        self.assertEqual(response_post_cancel.status_code, status.HTTP_401_UNAUTHORIZED)


# ▼▼▼▼▼Celery Task 테스트 클래스 ▼▼▼▼▼
class TradingTaskTests(TestCase):  # TestCase 상속

    def setUp(self):
        # 테스트용 사용자, 주식 생성 (API 테스트와 유사하게)
        self.user = User.objects.create_user(
            email="taskuser@example.com",
            nickname="taskuser",
            password="password123",
            cash_balance=Decimal("1000000.00"),  # 백만원
        )
        self.stock_samsung = Stock.objects.create(
            stock_code="005930", stock_name="삼성전자"
        )
        self.stock_sk = Stock.objects.create(
            stock_code="000660", stock_name="SK하이닉스"
        )
        # 초기 포트폴리오 (SK하이닉스 10주 보유)
        self.portfolio_sk = Portfolio.objects.create(
            user=self.user,
            stock=self.stock_sk,
            total_quantity=10,
            average_purchase_price=Decimal("100000.00"),
        )

    # --- Task: process_pending_limit_orders 테스트 ---

    @patch(
        "trading.tasks.get_current_stock_price_for_trading"
    )  # Task 파일 내의 함수 Mocking
    def test_task_process_buy_order_executed(self, mock_get_price):
        """[성공] Task - 지정가 매수 주문 체결 (현재가 <= 지정가)"""
        # 1. 테스트 주문 생성 (삼성 75,000원에 5주 매수 대기)
        limit_order = Order.objects.create(
            user=self.user,
            stock=self.stock_samsung,
            order_type="BUY",
            quantity=5,
            price_type="LIMIT",
            limit_price=Decimal("75000"),
            status=Order.StatusType.PENDING,
        )
        # 2. Mock 현재가 설정 (지정가보다 낮음 -> 체결 조건 충족)
        mock_get_price.return_value = Decimal("74000.00")

        # 3. Task 실행
        process_pending_limit_orders()

        # 4. 결과 검증
        limit_order.refresh_from_db()
        self.assertEqual(
            limit_order.status, Order.StatusType.COMPLETED
        )  # 상태 변경 확인

        # Transaction 생성 확인 (체결가는 지정가로 기록됨)
        transaction = Transaction.objects.get(order=limit_order)
        self.assertEqual(transaction.executed_price, Decimal("75000.00"))
        self.assertEqual(transaction.quantity, 5)

        # 사용자 자산 변경 확인
        self.user.refresh_from_db()
        # 1,000,000 - (75,000 * 5) = 1,000,000 - 375,000 = 625,000
        self.assertEqual(self.user.cash_balance, Decimal("625000.00"))

        # 포트폴리오 생성/업데이트 확인
        portfolio_samsung = Portfolio.objects.get(
            user=self.user, stock=self.stock_samsung
        )
        self.assertEqual(portfolio_samsung.total_quantity, 5)
        self.assertEqual(portfolio_samsung.average_purchase_price, Decimal("75000.00"))

    @patch("trading.tasks.get_current_stock_price_for_trading")
    def test_task_process_sell_order_executed(self, mock_get_price):
        """[성공] Task - 지정가 매도 주문 체결 (현재가 >= 지정가)"""
        # 1. 테스트 주문 생성 (SK하이닉스 110,000원에 5주 매도 대기, 10주 보유 중)
        limit_order = Order.objects.create(
            user=self.user,
            stock=self.stock_sk,
            order_type="SELL",
            quantity=5,
            price_type="LIMIT",
            limit_price=Decimal("110000"),
            status=Order.StatusType.PENDING,
        )
        # 2. Mock 현재가 설정 (지정가보다 높음 -> 체결 조건 충족)
        mock_get_price.return_value = Decimal("115000.00")

        # 3. Task 실행
        process_pending_limit_orders()

        # 4. 결과 검증
        limit_order.refresh_from_db()
        self.assertEqual(limit_order.status, Order.StatusType.COMPLETED)

        # Transaction 생성 확인 (체결가는 지정가로 기록됨)
        transaction = Transaction.objects.get(order=limit_order)
        self.assertEqual(transaction.executed_price, Decimal("110000.00"))

        # 사용자 자산 변경 확인
        self.user.refresh_from_db()
        # 1,000,000 + (110,000 * 5) = 1,000,000 + 550,000 = 1,550,000
        self.assertEqual(self.user.cash_balance, Decimal("1550000.00"))

        # 포트폴리오 업데이트 확인
        self.portfolio_sk.refresh_from_db()
        self.assertEqual(self.portfolio_sk.total_quantity, 5)  # 10주 -> 5주
        self.assertEqual(
            self.portfolio_sk.average_purchase_price, Decimal("100000.00")
        )  # 평단가 불변

    @patch("trading.tasks.get_current_stock_price_for_trading")
    def test_task_process_buy_order_not_executed(self, mock_get_price):
        """[성공] Task - 지정가 매수 주문 미체결 (현재가 > 지정가)"""
        limit_order = Order.objects.create(
            user=self.user,
            stock=self.stock_samsung,
            order_type="BUY",
            quantity=5,
            price_type="LIMIT",
            limit_price=Decimal("75000"),
            status=Order.StatusType.PENDING,
        )
        mock_get_price.return_value = Decimal("76000.00")  # 지정가보다 높음

        process_pending_limit_orders()

        limit_order.refresh_from_db()
        self.assertEqual(limit_order.status, Order.StatusType.PENDING)  # 상태 불변
        self.assertFalse(
            Transaction.objects.filter(order=limit_order).exists()
        )  # 거래 없음
        # 사용자 자산 불변 확인 (생략 가능)

    @patch("trading.tasks.get_current_stock_price_for_trading")
    def test_task_process_sell_order_not_executed(self, mock_get_price):
        """[성공] Task - 지정가 매도 주문 미체결 (현재가 < 지정가)"""
        limit_order = Order.objects.create(
            user=self.user,
            stock=self.stock_sk,
            order_type="SELL",
            quantity=5,
            price_type="LIMIT",
            limit_price=Decimal("110000"),
            status=Order.StatusType.PENDING,
        )
        mock_get_price.return_value = Decimal("105000.00")  # 지정가보다 낮음

        process_pending_limit_orders()

        limit_order.refresh_from_db()
        self.assertEqual(limit_order.status, Order.StatusType.PENDING)  # 상태 불변

    @patch("trading.tasks.get_current_stock_price_for_trading")
    def test_task_process_buy_order_failed_insufficient_funds_at_execution(
        self, mock_get_price
    ):
        """[실패] Task - 지정가 매수 체결 시점 예수금 부족"""
        limit_order = Order.objects.create(
            user=self.user,
            stock=self.stock_samsung,
            order_type="BUY",
            quantity=15,
            price_type="LIMIT",
            limit_price=Decimal("75000"),
            status=Order.StatusType.PENDING,
        )  # 1,125,000원 필요
        mock_get_price.return_value = Decimal("74000.00")  # 체결 조건 충족

        # 사용자의 예수금을 체결 전에 부족하게 변경 (100만원 -> 50만원)
        self.user.cash_balance = Decimal("500000.00")
        self.user.save()

        process_pending_limit_orders()

        limit_order.refresh_from_db()
        self.assertEqual(limit_order.status, Order.StatusType.FAILED)  # 실패 상태 확인
        self.assertFalse(
            Transaction.objects.filter(order=limit_order).exists()
        )  # 거래 없음

    @patch("trading.tasks.get_current_stock_price_for_trading")
    def test_task_process_sell_order_failed_insufficient_shares_at_execution(
        self, mock_get_price
    ):
        """[실패] Task - 지정가 매도 체결 시점 보유 수량 부족"""
        limit_order = Order.objects.create(
            user=self.user,
            stock=self.stock_sk,
            order_type="SELL",
            quantity=15,
            price_type="LIMIT",
            limit_price=Decimal("110000"),
            status=Order.StatusType.PENDING,
        )  # 15주 매도 (10주 보유)
        mock_get_price.return_value = Decimal("115000.00")  # 체결 조건 충족

        # 포트폴리오 수량을 체결 전에 부족하게 변경 (10주 -> 5주)
        self.portfolio_sk.total_quantity = 5
        self.portfolio_sk.save()

        process_pending_limit_orders()

        limit_order.refresh_from_db()
        self.assertEqual(limit_order.status, Order.StatusType.FAILED)  # 실패 상태 확인
        self.assertFalse(
            Transaction.objects.filter(order=limit_order).exists()
        )  # 거래 없음

    @patch("trading.tasks.get_current_stock_price_for_trading")
    def test_task_handles_api_error_gracefully(self, mock_get_price):
        """[성공] Task - 가격 조회 API 에러 발생 시 Task 중단 없이 진행"""
        pending_order1 = Order.objects.create(
            user=self.user,
            stock=self.stock_samsung,
            order_type="BUY",
            quantity=1,
            price_type="LIMIT",
            limit_price=Decimal("70000"),
            status=Order.StatusType.PENDING,
        )
        pending_order2 = Order.objects.create(
            user=self.user,
            stock=self.stock_sk,
            order_type="BUY",
            quantity=1,
            price_type="LIMIT",
            limit_price=Decimal("100000"),
            status=Order.StatusType.PENDING,
        )

        # 첫 번째 주식(삼성) 조회 시 에러 발생, 두 번째(SK)는 정상 가격 반환하도록 설정
        def mock_price_logic(stock_code):
            if stock_code == "005930":
                raise ConnectionError("API Error")
            elif stock_code == "000660":
                return Decimal("95000.00")  # 체결 조건 충족
            return None

        mock_get_price.side_effect = mock_price_logic

        # Task 실행 (에러가 발생해도 중단되지 않아야 함)
        process_pending_limit_orders()

        # 결과 검증
        pending_order1.refresh_from_db()
        pending_order2.refresh_from_db()

        self.assertEqual(
            pending_order1.status, Order.StatusType.PENDING
        )  # 에러 발생한 주문은 PENDING 유지
        self.assertEqual(
            pending_order2.status, Order.StatusType.COMPLETED
        )  # 정상 조회된 주문은 체결됨
