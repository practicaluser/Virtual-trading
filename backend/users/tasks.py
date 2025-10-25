# backend/users/tasks.py

# from django.utils import timezone
# from django.db import transaction as db_transaction
# from decimal import Decimal
# import calendar

# from users.models import User, AssetHistory
# from trading.models import Portfolio
# from stocks.views import get_current_stock_price_for_trading

import logging

from celery import shared_task
from django.core.management import call_command

# 로거 설정
logger = logging.getLogger(__name__)


@shared_task
def task_record_asset_snapshot():
    """
    Celery Task가 'record_asset_snapshot' Management Command를 호출합니다.

    실제 자산 기록 로직 및 날짜(마지막 거래일) 확인 로직은
    'record_asset_snapshot' Command가 모두 담당합니다.
    """
    logger.info(
        "Celery: 'record_asset_snapshot' management command 실행을 시도합니다..."
    )
    try:
        # Management Command를 이름으로 직접 실행
        call_command("record_asset_snapshot")

        logger.info("Celery: 'record_asset_snapshot' command 실행 완료.")
        return "Management command 'record_asset_snapshot' executed."
    except Exception as e:
        logger.error(f"Celery: 'record_asset_snapshot' command 실행 중 오류 발생: {e}")
        return f"Error executing command: {e}"


# def is_last_trading_day_of_month(date_to_check):
#     """주어진 날짜가 해당 월의 마지막 '거래일'인지 간단히 확인 (주말만 제외)"""
#     _, last_day_of_month = calendar.monthrange(date_to_check.year, date_to_check.month)
#     is_last_day = (date_to_check.day == last_day_of_month)
#     is_weekend = date_to_check.weekday() >= 5

#     if is_last_day and not is_weekend: return True
#     elif date_to_check.weekday() == 4: # 금요일인데
#          if (date_to_check.day + 1 == last_day_of_month) or \
#             (date_to_check.day + 2 == last_day_of_month):
#             return True
#     return False

# @shared_task # Celery Task로 만들기 위한 데코레이터
# def task_record_asset_snapshot():
#     """
#     모든 활성 사용자의 총 자산 스냅샷을 기록하는 Celery Task
#     (Management Command의 로직을 가져옴)
#     """
#     today = timezone.now().date()

#     # [주석 해제 필요] 실제 운영 시에는 날짜 체크 로직 활성화
#     # if not is_last_trading_day_of_month(today):
#     #     logger.info(f"{today}은(는) 마지막 거래일이 아니므로 스냅샷을 기록하지 않습니다.")
#     #     return f"{today}: Not the last trading day."

#     logger.info(f"[{today}] 월말 자산 스냅샷 기록 작업을 시작합니다.")

#     users = User.objects.filter(is_active=True)
#     total_users = users.count()
#     processed_users = 0
#     errors = []

#     for user in users:
#         try:
#             total_stock_value = Decimal('0.00')
#             portfolio_items = Portfolio.objects.filter(user=user, total_quantity__gt=0)

#             for item in portfolio_items:
#                 try:
#                     current_price = get_current_stock_price_for_trading(item.stock.stock_code)
#                     if current_price is not None:
#                         total_stock_value += current_price * item.total_quantity
#                     else:
#                         logger.warning(f"경고: {user.email}의 {item.stock.stock_name} 현재가 조회 실패. 자산 계산에서 제외됩니다.")
#                 except Exception as price_error:
#                     logger.error(f"에러: {user.email}의 {item.stock.stock_name} 가격 조회 중 오류: {price_error}")

#             total_asset = total_stock_value + user.cash_balance

#             with db_transaction.atomic():
#                 AssetHistory.objects.update_or_create(
#                     user=user,
#                     snapshot_date=today,
#                     defaults={'total_asset': total_asset}
#                 )

#             processed_users += 1
#             if processed_users % 10 == 0:
#                 logger.info(f"... {processed_users}/{total_users} 명 처리 완료 ...")

#         except Exception as e:
#             error_msg = f"에러: 사용자 {user.email}의 자산 스냅샷 기록 중 오류 발생: {e}"
#             logger.error(error_msg)
#             errors.append(error_msg)

#     result_message = f"총 {total_users}명 중 {processed_users}명의 자산 스냅샷 기록 완료!"
#     if errors:
#         result_message += f" ({len(errors)}명 처리 중 오류 발생)"
#         logger.error(f"자산 스냅샷 작업 중 {len(errors)}개의 오류 발생:\n" + "\n".join(errors))

#     logger.info(result_message)
#     return result_message # 작업 결과를 반환 (django-celery-results에 저장됨)
