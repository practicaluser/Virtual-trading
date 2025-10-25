# backend/trading/serializers.py

from rest_framework import serializers
from django.db import transaction
from decimal import Decimal
from datetime import datetime # [추가] datetime 임포트 (타입 힌팅용)

# [수정] Transaction 모델도 임포트
from .models import Order, Transaction, Portfolio
from stocks.models import Stock
from stocks.views import get_current_stock_price_for_trading
from users.models import User

# --- 출력용 Serializers ---

class StockSimpleSerializer(serializers.ModelSerializer):
    """
    Portfolio나 Order 내역에서 종목 정보를 간단히 보여주기 위한 Serializer
    """
    class Meta:
        model = Stock
        fields = ['stock_code', 'stock_name']


class PortfolioSerializer(serializers.ModelSerializer):
    """
    보유 주식 현황 (포트폴리오) 출력용 Serializer
    """
    stock = StockSimpleSerializer(read_only=True)

    # SerializerMethodField가 반환하는 Decimal 타입을 JSON으로 변환하도록 타입 명시
    current_price = serializers.SerializerMethodField()
    total_value = serializers.SerializerMethodField()
    profit_loss = serializers.SerializerMethodField()
    profit_loss_rate = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = [
            'stock',
            'total_quantity',
            'average_purchase_price', # ModelSerializer가 'string'으로 처리
            'current_price',          # DecimalField가 'string'으로 처리
            'total_value',            # DecimalField가 'string'으로 처리
            'profit_loss',            # DecimalField가 'string'으로 처리
            'profit_loss_rate'        # FloatField가 'number'로 처리
        ]

    def get_current_price(self, obj: Portfolio) -> Decimal | None:
        try: return get_current_stock_price_for_trading(obj.stock.stock_code)
        except (ConnectionError, ValueError): return None
    def get_total_value(self, obj: Portfolio) -> Decimal | None:
        cp = self.get_current_price(obj)
        return cp * obj.total_quantity if cp else None
    def get_profit_loss(self, obj: Portfolio) -> Decimal | None:
        tv = self.get_total_value(obj)
        return tv - (obj.average_purchase_price * obj.total_quantity) if tv else None
    def get_profit_loss_rate(self, obj: Portfolio) -> Decimal | None:
        pl = self.get_profit_loss(obj)
        if pl is None: return None
        tc = obj.average_purchase_price * obj.total_quantity
        return (pl / tc) * 100 if tc > 0 else Decimal('0.00')


# ▼▼▼▼▼ [수정됨] OrderSerializer (체결 정보 추가) ▼▼▼▼▼
class OrderSerializer(serializers.ModelSerializer):
    """
    주문 내역 출력용 Serializer (GET /api/trading/orders/)
    - 연관된 Transaction의 체결 정보를 포함합니다.
    """
    stock = StockSimpleSerializer(read_only=True)
    executed_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True, allow_null=True)
    transaction_timestamp = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = Order
        # [수정] 필요한 필드를 명시적으로 나열하고, 추가 필드 포함
        fields = [
            'id',
            'stock',                # 종목 정보 (StockSimpleSerializer)
            'order_type',           # 'BUY' or 'SELL'
            'quantity',             # 주문 수량
            'price_type',           # 'MARKET' or 'LIMIT'
            'limit_price',          # 지정가 (지정가 주문 시)
            'status',               # 'PENDING', 'COMPLETED', 'FAILED'
            'timestamp',            # 주문 접수 시간
            'executed_price',       # [추가] 체결 가격 (Transaction)
            'total_amount',         # [추가] 거래 금액 (체결가 * 수량)
            'transaction_timestamp',# [추가] 체결 시간 (Transaction)
        ]
        read_only_fields = fields # GET 요청 전용이므로 모두 읽기 전용

    def to_representation(self, instance: Order):
        """
        [수정]
        Order 객체를 JSON으로 변환할 때 Transaction 데이터를 추가합니다.
        SerializerMethodField 대신 to_representation을 오버라이드하여
        DB 쿼리를 한 번만 실행하도록 최적화합니다.
        """
        # 기본 Serializer의 representation (Order 모델 필드들)
        representation = super().to_representation(instance)

        # 연관된 Transaction 객체 조회 (체결된 경우에만 존재)
        transaction = instance.transaction_set.first()

        if transaction:
            representation['executed_price'] = transaction.executed_price
            representation['total_amount'] = transaction.executed_price * instance.quantity # 백엔드 계산
            representation['transaction_timestamp'] = transaction.timestamp
        else:
            # 미체결(PENDING) 또는 실패(FAILED) 주문
            representation['executed_price'] = None
            representation['total_amount'] = None
            representation['transaction_timestamp'] = None

        return representation


# --- 입력용 Serializer (변경 없음) ---

class OrderCreateSerializer(serializers.ModelSerializer):
    """
    주문 생성을 위한 Serializer (POST /api/trading/orders/)
    """
    stock = serializers.SlugRelatedField(
        slug_field='stock_code',
        queryset=Stock.objects.all()
    )

    class Meta:
        model = Order
        fields = ['stock', 'order_type', 'quantity', 'price_type', 'limit_price']

    def validate(self, data):
        # ... (기존 지정가/시장가 유효성 검증 로직)
        quantity = data.get('quantity')
        if quantity <= 0: raise serializers.ValidationError("...")
        price_type = data.get('price_type')
        user = self.context['request'].user
        stock = data.get('stock')
        order_type = data.get('order_type')
        if price_type == Order.PriceType.MARKET: data['limit_price'] = None
        elif price_type == Order.PriceType.LIMIT:
            limit_price = data.get('limit_price')
            if not limit_price or limit_price <= 0: raise serializers.ValidationError("...")
            if order_type == Order.OrderType.BUY:
                if user.cash_balance < (limit_price * quantity): raise serializers.ValidationError("...")
            elif order_type == Order.OrderType.SELL:
                portfolio = Portfolio.objects.filter(user=user, stock=stock).first()
                if not portfolio or portfolio.total_quantity < quantity: raise serializers.ValidationError("...")
        return data

    def create(self, validated_data):
        # ... (기존 주문 생성 및 체결 로직)
        user = self.context['request'].user
        price_type = validated_data['price_type']
        order = Order.objects.create(user=user, status=Order.StatusType.PENDING, **validated_data)
        if price_type == Order.PriceType.MARKET:
            stock = validated_data['stock']; quantity = validated_data['quantity']; order_type = validated_data['order_type']
            try:
                with transaction.atomic():
                    locked_user = User.objects.select_for_update().get(id=user.id)
                    current_price = get_current_stock_price_for_trading(stock.stock_code)
                    total_cost = current_price * quantity
                    if order_type == Order.OrderType.BUY:
                        if locked_user.cash_balance < total_cost: raise serializers.ValidationError("...")
                        locked_user.cash_balance -= total_cost
                        portfolio, created = Portfolio.objects.get_or_create(user=user, stock=stock)
                        # ... 평단가 계산 ...
                        portfolio.average_purchase_price = ((portfolio.average_purchase_price * portfolio.total_quantity) + total_cost) / (portfolio.total_quantity + quantity)
                        portfolio.total_quantity += quantity
                        portfolio.save()
                    elif order_type == Order.OrderType.SELL:
                        portfolio = Portfolio.objects.get(user=user, stock=stock)
                        if portfolio.total_quantity < quantity: raise serializers.ValidationError("...")
                        locked_user.cash_balance += total_cost
                        portfolio.total_quantity -= quantity
                        if portfolio.total_quantity == 0: portfolio.delete()
                        else: portfolio.save()
                    locked_user.save(update_fields=['cash_balance'])
                    Transaction.objects.create(user=user, stock=stock, order=order, transaction_type=order_type, quantity=quantity, executed_price=current_price)
                    order.status = Order.StatusType.COMPLETED; order.save(update_fields=['status'])
                    return order
            except (ValueError, ConnectionError, serializers.ValidationError, Portfolio.DoesNotExist) as e:
                order.status = Order.StatusType.FAILED; order.save(update_fields=['status'])
                if isinstance(e, Portfolio.DoesNotExist): raise serializers.ValidationError("...")
                raise serializers.ValidationError(str(e))
        elif price_type == Order.PriceType.LIMIT:
            return order