# backend/trading/tasks.py

import logging
from decimal import Decimal

from celery import shared_task
from django.db import transaction as db_transaction

# 현재가 조회 함수 경로 확인 필요
from stocks.views import get_current_stock_price_for_trading
from users.models import User

from .models import Order, Portfolio, Transaction

logger = logging.getLogger(__name__)


@shared_task
def process_pending_limit_orders():
    """
    보류 중인 모든 지정가 주문을 확인하고 시장 가격 조건이 충족되면 실행합니다.
    이 작업은 Celery Beat에 의해 주기적으로 (예: 매 분마다) 실행되어야 합니다.
    """
    pending_orders = Order.objects.filter(
        status=Order.StatusType.PENDING, price_type=Order.PriceType.LIMIT
    ).select_related(
        "user", "stock"
    )  # DB 쿼리 최적화

    logger.info(f"{pending_orders.count()}개의 미체결 지정가 주문을 확인합니다...")
    executed_count = 0
    failed_count = 0

    for order in pending_orders:
        try:
            # 1. 현재 시장가 가져오기
            current_price = get_current_stock_price_for_trading(order.stock.stock_code)
            if current_price is None:
                logger.warning(
                    f"{order.stock.stock_name} (주문 ID: {order.id})의 현재가를 가져올 수 없습니다. 건너<0xEB><0x9B><0x81>니다."
                )
                continue

            # 2. 주문 유형에 따라 체결 조건 확인
            should_execute = False
            execution_price = (
                order.limit_price
            )  # 지정가 또는 더 유리한 가격으로 체결 (일반적으로 지정가 사용)
            if (
                order.order_type == Order.OrderType.BUY
                and current_price <= order.limit_price
            ):
                should_execute = True
                # 실제 체결가는 지정가 또는 현재가 중 유리한 쪽으로 할 수 있으나, 여기서는 지정가로 통일
            elif (
                order.order_type == Order.OrderType.SELL
                and current_price >= order.limit_price
            ):
                should_execute = True
                # 실제 체결가는 지정가 또는 현재가 중 유리한 쪽으로 할 수 있으나, 여기서는 지정가로 통일

            # 3. 조건 충족 시 체결 실행
            if should_execute:
                logger.info(
                    f"주문 ID 실행: {order.id} ({order.order_type} {order.stock.stock_name} @ {execution_price} vs 현재가 {current_price})"
                )
                try:
                    # 각 주문 체결 시도를 원자적 트랜잭션으로 처리
                    with db_transaction.atomic():
                        # 동시성 문제를 방지하기 위해 사용자 및 포트폴리오 행에 Lock 설정
                        user = User.objects.select_for_update().get(id=order.user.id)

                        total_cost = execution_price * order.quantity

                        if order.order_type == Order.OrderType.BUY:
                            # 체결 시점에 잔고 재확인
                            if user.cash_balance < total_cost:
                                raise ValueError(
                                    "체결 시점 예수금 부족."
                                )  # 주문 실패 처리

                            user.cash_balance -= total_cost

                            # 포트폴리오 행이 존재하면 Lock 설정
                            (
                                portfolio,
                                created,
                            ) = Portfolio.objects.select_for_update().get_or_create(
                                user=user, stock=order.stock
                            )
                            total_cost_prev = (
                                portfolio.average_purchase_price
                                * portfolio.total_quantity
                            )
                            total_quantity_new = (
                                portfolio.total_quantity + order.quantity
                            )
                            # 평단가 재계산
                            portfolio.average_purchase_price = (
                                total_cost_prev + total_cost
                            ) / total_quantity_new
                            portfolio.total_quantity = total_quantity_new
                            portfolio.save()

                        elif order.order_type == Order.OrderType.SELL:
                            # 체결 시점에 보유 수량 재확인
                            try:
                                portfolio = Portfolio.objects.select_for_update().get(
                                    user=user, stock=order.stock
                                )
                                if portfolio.total_quantity < order.quantity:
                                    raise ValueError(
                                        "체결 시점 보유 수량 부족."
                                    )  # 주문 실패 처리
                            except Portfolio.DoesNotExist:
                                raise ValueError(
                                    "체결 시점 포트폴리오 없음."
                                )  # 주문 실패 처리

                            user.cash_balance += total_cost
                            portfolio.total_quantity -= order.quantity
                            if portfolio.total_quantity == 0:
                                portfolio.delete()
                            else:
                                portfolio.save()

                        # 사용자 잔고 변경 저장
                        user.save(update_fields=["cash_balance"])

                        # Transaction(거래 내역) 생성
                        Transaction.objects.create(
                            user=user,
                            stock=order.stock,
                            order=order,
                            transaction_type=order.order_type,
                            quantity=order.quantity,
                            executed_price=execution_price,  # 결정된 체결 가격 사용
                        )

                        # 주문 상태를 COMPLETED로 업데이트
                        order.status = Order.StatusType.COMPLETED
                        order.save(update_fields=["status"])
                        executed_count += 1

                except (
                    ValueError,
                    Portfolio.DoesNotExist,
                ) as exec_error:  # 체결 시점 유효성 검사 오류 처리
                    logger.warning(
                        f"주문 ID {order.id} 체결 실패 (유효성 검사 오류): {exec_error}"
                    )
                    order.status = Order.StatusType.FAILED
                    order.save(update_fields=["status"])
                    failed_count += 1
                except Exception as db_error:  # 체결 중 DB 오류 처리
                    logger.error(f"주문 ID {order.id} 체결 중 DB 오류: {db_error}")
                    # 주문 상태 변경 없이 다음 주기에 재시도
                    # 필요시 다른 에러 상태로 변경 가능

        except ConnectionError as api_error:
            # 가격 조회 오류 - 로그 남기고 다음 주문으로 진행 (다음 주기에 재시도)
            logger.error(f"주문 ID {order.id} 처리 중 API 연결 오류: {api_error}")
        except Exception as e:
            # 예상치 못한 오류 - 로그 남기고 다음 주문으로 진행
            logger.error(f"주문 ID {order.id} 처리 중 예상치 못한 오류: {e}")

    result_message = (
        f"미체결 주문 처리 완료. 체결: {executed_count}, 실패: {failed_count}"
    )
    logger.info(result_message)
    return result_message
