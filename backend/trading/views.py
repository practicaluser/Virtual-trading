# backend/trading/views.py

from rest_framework import status
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from concurrent.futures import ThreadPoolExecutor, as_completed # [추가] 병렬 처리를 위해
from decimal import Decimal # [추가] Decimal 임포트
import logging # [추가] 로깅

from .models import Order, Portfolio
from .serializers import (
    OrderSerializer,
    OrderCreateSerializer,
    PortfolioSerializer
)
# Order 모델의 StatusType을 직접 사용하기 위해 임포트 (선택사항, 가독성 향상)
from .models import Order
# [수정] 현재가 조회 함수 직접 임포트
from stocks.views import get_current_stock_price_for_trading

logger = logging.getLogger(__name__)

class OrderListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return OrderCreateSerializer
        return OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by("-timestamp")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        output_serializer = OrderSerializer(serializer.instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(
            output_serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

# ▼▼▼▼▼ [수정됨] PortfolioListView ▼▼▼▼▼
class PortfolioListView(generics.ListAPIView):
    """
    [수정됨] 사용자의 보유 주식 현황 (포트폴리오) 목록
    - View에서 현재가를 미리 조회하여 Serializer에 전달 (N+1 문제 해결)
    - 가격 조회 병렬 처리 적용
    """
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # stock 정보도 함께 가져오도록 select_related 추가
        return Portfolio.objects.filter(
            user=self.request.user,
            total_quantity__gt=0
        ).select_related('stock')

    def list(self, request, *args, **kwargs):
        """
        ListAPIView의 list 메서드를 오버라이드하여 가격 pre-fetching 로직 추가
        """
        queryset = self.filter_queryset(self.get_queryset())

        # 1. 필요한 모든 종목 코드 추출
        stock_codes = list(queryset.values_list('stock__stock_code', flat=True))

        price_cache = {} # 종목 코드별 현재가를 저장할 딕셔너리

        # 2. 가격 병렬 조회 (ThreadPoolExecutor 사용)
        with ThreadPoolExecutor(max_workers=10) as executor: # max_workers는 서버 환경에 맞게 조절
            future_to_code = {
                executor.submit(get_current_stock_price_for_trading, code): code
                for code in stock_codes
            }

            for future in as_completed(future_to_code):
                code = future_to_code[future]
                try:
                    # 함수 실행 결과 (Decimal 가격) 가져오기
                    # get_current_stock_price_for_trading 함수가 Decimal을 반환한다고 가정
                    price = future.result()
                    price_cache[code] = price
                    logger.debug(f"Fetched price for {code}: {price}")
                except Exception as exc:
                    # 가격 조회 중 에러 발생 시 None 저장하고 로그 남기기
                    logger.error(f'Error fetching price for {code}: {exc}')
                    price_cache[code] = None # 오류 발생 시 None으로 처리

        # 3. Serializer context에 가격 캐시 전달
        context = self.get_serializer_context()
        context['price_cache'] = price_cache # 조회된 가격 딕셔너리 추가

        # 4. Serializer 실행 (context 전달)
        serializer = self.get_serializer(queryset, many=True, context=context)

        return Response(serializer.data)

# ▼▼▼▼▼ [신규] 미체결 주문 목록 조회 API ▼▼▼▼▼
class PendingOrderListView(generics.ListAPIView):
    """
    로그인한 사용자의 '미체결(PENDING)' 상태인 주문 목록만 반환합니다.
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user,
            status=Order.StatusType.PENDING # models.Order 에서 가져온 상수 사용
        ).order_by("-timestamp") # 최신순 정렬

# ▼▼▼▼▼ [신규] 주문 취소 API ▼▼▼▼▼
class CancelOrderView(APIView):
    """
    특정 주문 ID를 받아 해당 주문을 '취소(CANCELED)' 처리합니다.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id, *args, **kwargs):
        """
        주어진 order_id에 해당하는 주문을 취소합니다. (POST 요청 사용)
        """
        try:
            order = Order.objects.get(
                id=order_id, user=request.user, status=Order.StatusType.PENDING
            )
        except Order.DoesNotExist:
            return Response(
                {"detail": "취소할 수 없는 주문입니다."},
                status=status.HTTP_404_NOT_FOUND,
            )

        order.status = Order.StatusType.CANCELED
        order.save(update_fields=["status"])

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)