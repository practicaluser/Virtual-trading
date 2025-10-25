# backend/trading/views.py

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response  # [추가]
from rest_framework import status  # [추가]
from rest_framework.views import APIView

from .models import Order, Portfolio
from .serializers import OrderSerializer, OrderCreateSerializer, PortfolioSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        # 요청 메서드에 따라 사용할 Serializer를 결정
        if self.request.method == "POST":
            return OrderCreateSerializer  # 생성(입력) 시
        return OrderSerializer  # 목록(출력) 시

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by("-timestamp")

    # [수정] create 메서드를 오버라이드
    def create(self, request, *args, **kwargs):
        """
        주문 생성(POST) 로직을 커스터마이징합니다.
        입력은 OrderCreateSerializer로,
        출력은 OrderSerializer로 처리합니다.
        """
        # 1. 입력용 Serializer (OrderCreateSerializer)로 데이터 검증
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 2. serializer.save()를 호출 -> OrderCreateSerializer.create() 실행
        self.perform_create(serializer)

        # 3. 성공 시, serializer.instance에 생성된 Order 객체가 담김

        # 4. [핵심] 출력용 Serializer (OrderSerializer)로 응답 데이터를 생성
        output_serializer = OrderSerializer(serializer.instance)

        headers = self.get_success_headers(output_serializer.data)
        return Response(
            output_serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class PortfolioListView(generics.ListAPIView):
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user, total_quantity__gt=0)


# ▼▼▼▼▼ [신규] 미체결 주문 목록 조회 API ▼▼▼▼▼
class PendingOrderListView(generics.ListAPIView):
    """
    로그인한 사용자의 '미체결(PENDING)' 상태인 주문 목록만 반환합니다.
    """

    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 현재 로그인한 사용자의 주문 중 status가 'PENDING'인 것만 필터링
        return Order.objects.filter(
            user=self.request.user,
            status=Order.StatusType.PENDING,  # models.Order 에서 가져온 상수 사용
        ).order_by(
            "-timestamp"
        )  # 최신순 정렬


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
            # 1. 주문 조회 (본인 주문 + PENDING 상태인지 확인)
            order = Order.objects.get(
                id=order_id, user=request.user, status=Order.StatusType.PENDING
            )
        except Order.DoesNotExist:
            # 주문이 없거나, 본인 주문이 아니거나, PENDING 상태가 아닌 경우
            return Response(
                {"detail": "취소할 수 없는 주문입니다."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. 주문 상태를 'CANCELED'로 변경
        order.status = Order.StatusType.CANCELED
        order.save(update_fields=["status"])

        # 3. 성공 응답 (선택: 취소된 주문 정보 반환 또는 204 No Content)
        serializer = OrderSerializer(order)  # 취소된 주문 정보를 보여주기 위해
        return Response(serializer.data, status=status.HTTP_200_OK)
        # 또는 내용 없이 성공만 알리려면:
        # return Response(status=status.HTTP_204_NO_CONTENT)
