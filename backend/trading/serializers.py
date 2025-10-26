# backend/trading/serializers.py

from rest_framework import serializers
from django.db import transaction
from decimal import Decimal, ROUND_HALF_UP # [추가] 반올림 설정
from datetime import datetime

# [수정] Transaction 모델도 임포트
from .models import Order, Transaction, Portfolio
from stocks.models import Stock
# [삭제] View에서 직접 임포트하므로 Serializer에서는 불필요
# from stocks.views import get_current_stock_price_for_trading
from users.models import User

# --- 출력용 Serializers ---

class StockSimpleSerializer(serializers.ModelSerializer):
    """
    Portfolio나 Order 내역에서 종목 정보를 간단히 보여주기 위한 Serializer
    """
    class Meta:
        model = Stock
        fields = ['stock_code', 'stock_name']

# ▼▼▼▼▼ [수정됨] PortfolioSerializer (N+1 최적화 적용) ▼▼▼▼▼
class PortfolioSerializer(serializers.ModelSerializer):
    """
    [수정됨] 보유 주식 현황 (포트폴리오) 출력용 Serializer
    - View로부터 price_cache를 받아 실시간 데이터를 계산합니다.
    """
    stock = StockSimpleSerializer(read_only=True)
    # [추가] 계산된 필드들을 명시적으로 선언 (타입 및 읽기 전용 설정)
    current_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True, allow_null=True)
    profit_loss = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True, allow_null=True)
    profit_loss_rate = serializers.FloatField(read_only=True, allow_null=True) # 수익률은 Float 허용

    class Meta:
        model = Portfolio
        # [수정] 계산된 필드 이름들을 fields에 포함
        fields = [
            'stock',
            'total_quantity',
            'average_purchase_price', # ModelSerializer가 'string'으로 처리
            'current_price',          # 계산 필드
            'total_value',            # 계산 필드
            'profit_loss',            # 계산 필드
            'profit_loss_rate'        # 계산 필드
        ]
        read_only_fields = fields # 모든 필드를 읽기 전용으로

    # [삭제] SerializerMethodField를 사용하지 않으므로 get_... 메서드들 삭제

    def to_representation(self, instance: Portfolio):
        """
        [추가] Portfolio 객체를 JSON으로 변환할 때 계산 로직 수행
        """
        # 기본 representation (stock, total_quantity, average_purchase_price 포함)
        representation = super().to_representation(instance)

        # View에서 전달받은 가격 캐시 가져오기
        price_cache = self.context.get('price_cache', {})
        stock_code = instance.stock.stock_code
        # 캐시에서 현재가 조회 (Decimal 또는 None)
        current_price = price_cache.get(stock_code)

        # 계산 필드 초기화
        total_value = None
        profit_loss = None
        profit_loss_rate = None

        if current_price is not None:
            # 현재가가 유효할 경우 계산 수행
            total_value = current_price * instance.total_quantity
            total_cost = instance.average_purchase_price * instance.total_quantity
            profit_loss = total_value - total_cost
            if total_cost > 0:
                # 수익률 계산 (소수점 둘째 자리까지 반올림)
                rate = (profit_loss / total_cost) * 100
                profit_loss_rate = float(rate.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
            else:
                profit_loss_rate = 0.0 # 매수 원가가 0이면 0%

        # 계산된 값들을 representation에 추가
        # DecimalField로 선언된 필드는 자동으로 문자열로 변환됨
        representation['current_price'] = current_price
        representation['total_value'] = total_value
        representation['profit_loss'] = profit_loss
        # FloatField로 선언된 필드는 숫자로 변환됨
        representation['profit_loss_rate'] = profit_loss_rate

        return representation

# ▼▼▼▼▼ [수정됨] OrderSerializer (체결 정보 추가 및 to_representation 사용) ▼▼▼▼▼
class OrderSerializer(serializers.ModelSerializer):
    """
    주문 내역 출력용 Serializer (GET /api/trading/orders/, /pending/)
    - 연관된 Transaction의 체결 정보를 포함합니다.
    """
    stock = StockSimpleSerializer(read_only=True)

    # [추가] 계산/조회될 필드 명시적 선언
    executed_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True, allow_null=True)
    transaction_timestamp = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = Order
        fields = [
            'id', 'stock', 'order_type', 'quantity', 'price_type',
            'limit_price', 'status', 'timestamp',
            'executed_price', 'total_amount', 'transaction_timestamp', # 추가 필드
        ]
        read_only_fields = fields

    def to_representation(self, instance: Order):
        """
        Order 객체를 JSON으로 변환할 때 Transaction 데이터를 추가합니다.
        (이전 코드와 동일)
        """
        representation = super().to_representation(instance)
        transaction = instance.transaction_set.first()
        if transaction:
            representation['executed_price'] = transaction.executed_price
            representation['total_amount'] = transaction.executed_price * instance.quantity
            representation['transaction_timestamp'] = transaction.timestamp
        else:
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
        slug_field="stock_code", queryset=Stock.objects.all()
    )

    class Meta:
        model = Order
        fields = ["stock", "order_type", "quantity", "price_type", "limit_price"]

    def validate(self, data):
        # ... (기존 지정가/시장가 유효성 검증 로직) ...
        # (이전 코드와 동일하게 유지)
        quantity = data.get("quantity"); price_type = data.get("price_type")
        user = self.context["request"].user; stock = data.get("stock")
        order_type = data.get("order_type")
        if quantity <= 0: raise serializers.ValidationError("...")
        if price_type == Order.PriceType.MARKET: data["limit_price"] = None
        elif price_type == Order.PriceType.LIMIT:
            limit_price = data.get("limit_price")
            if not limit_price or limit_price <= 0: raise serializers.ValidationError("...")
            if order_type == Order.OrderType.BUY:
                if user.cash_balance < (limit_price * quantity): raise serializers.ValidationError("...")
            elif order_type == Order.OrderType.SELL:
                portfolio = Portfolio.objects.filter(user=user, stock=stock).first()
                if not portfolio or portfolio.total_quantity < quantity: raise serializers.ValidationError("...")
        return data

    def create(self, validated_data):
        # ... (기존 주문 생성 및 체결 로직) ...
        # (이전 코드와 동일하게 유지)
        user = self.context["request"].user; price_type = validated_data["price_type"]
        order = Order.objects.create(user=user, status=Order.StatusType.PENDING, **validated_data)
        if price_type == Order.PriceType.MARKET:
            stock = validated_data["stock"]; quantity = validated_data["quantity"]; order_type = validated_data["order_type"]
            try:
                with transaction.atomic():
                    locked_user = User.objects.select_for_update().get(id=user.id)
                    # 여기서는 stocks.views의 헬퍼 함수를 직접 사용
                    from stocks.views import get_current_stock_price_for_trading
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
                    locked_user.save(update_fields=["cash_balance"])
                    Transaction.objects.create(user=user, stock=stock, order=order, transaction_type=order_type, quantity=quantity, executed_price=current_price)
                    order.status = Order.StatusType.COMPLETED; order.save(update_fields=["status"])
                    return order
            except (ValueError, ConnectionError, serializers.ValidationError, Portfolio.DoesNotExist) as e:
                order.status = Order.StatusType.FAILED; order.save(update_fields=["status"])
                if isinstance(e, Portfolio.DoesNotExist): raise serializers.ValidationError("...")
                raise serializers.ValidationError(str(e))
        elif price_type == Order.PriceType.LIMIT:
            return order