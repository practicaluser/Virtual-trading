# backend/trading/models.py

from decimal import Decimal

from django.conf import settings
from django.db import models

# users.User 모델을 직접 참조하는 대신 settings.AUTH_USER_MODEL 사용 권장
# stocks.Stock 모델은 'stocks.Stock' 문자열로 참조 (순환 참조 방지)


class Order(models.Model):
    """
    사용자의 주문(매수/매도 의도)을 기록하는 모델
    """

    class OrderType(models.TextChoices):
        BUY = "BUY", "매수"
        SELL = "SELL", "매도"

    class PriceType(models.TextChoices):
        MARKET = "MARKET", "시장가"
        LIMIT = "LIMIT", "지정가"

    class StatusType(models.TextChoices):
        PENDING = "PENDING", "체결 대기"
        COMPLETED = "COMPLETED", "체결 완료"
        FAILED = "FAILED", "주문 실패"
        CANCELED = "CANCELED", "주문 취소"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name="주문자"
    )
    stock = models.ForeignKey(
        "stocks.Stock",
        on_delete=models.PROTECT,  # 주식 정보가 삭제되지 않도록 보호
        verbose_name="주문 종목",
    )
    order_type = models.CharField(
        max_length=4, choices=OrderType.choices, verbose_name="주문 유형"
    )
    quantity = models.PositiveIntegerField(verbose_name="주문 수량")
    price_type = models.CharField(
        max_length=6,
        choices=PriceType.choices,
        default=PriceType.MARKET,
        verbose_name="가격 유형",
    )
    limit_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="지정가"
    )
    status = models.CharField(
        max_length=10,
        choices=StatusType.choices,
        default=StatusType.PENDING,
        verbose_name="주문 상태",
    )
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="주문 시간")

    def __str__(self):
        return f"[{self.get_status_display()}] {self.user} - {self.stock.stock_name} {self.quantity}주"


class Transaction(models.Model):
    """
    성공적으로 체결된 거래 내역 (영수증)
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name="거래자"
    )
    stock = models.ForeignKey(
        "stocks.Stock", on_delete=models.PROTECT, verbose_name="거래 종목"
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,  # 원본 주문이 삭제되어도 거래 내역은 유지
        null=True,
        blank=True,
        verbose_name="원본 주문",
    )
    transaction_type = models.CharField(
        max_length=4, choices=Order.OrderType.choices, verbose_name="거래 유형"
    )
    quantity = models.PositiveIntegerField(verbose_name="체결 수량")
    executed_price = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="체결 가격"
    )
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="체결 시간")

    def __str__(self):
        return f"[{self.get_transaction_type_display()}] {self.user} - {self.stock.stock_name} @{self.executed_price}"


class Portfolio(models.Model):
    """
    사용자별 보유 주식 현황 (요약)
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name="소유자"
    )
    stock = models.ForeignKey(
        "stocks.Stock", on_delete=models.PROTECT, verbose_name="보유 종목"
    )
    total_quantity = models.PositiveIntegerField(default=0, verbose_name="총 보유 수량")
    average_purchase_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="평균 매수 단가",
    )

    class Meta:
        # 한 사용자는 특정 주식에 대해 하나의 포트폴리오 레코드만 가짐
        unique_together = ("user", "stock")

    def __str__(self):
        return f"{self.user}의 {self.stock.stock_name} (평단가: {self.average_purchase_price})"
