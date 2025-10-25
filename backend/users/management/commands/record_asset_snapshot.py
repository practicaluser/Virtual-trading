# backend/users/management/commands/record_asset_snapshot.py

import calendar
import logging  # 로깅 사용
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from django.utils import timezone
from pykrx import stock

from stocks.views import get_current_stock_price_for_trading
from trading.models import Portfolio
from users.models import AssetHistory, User

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "매월 마지막 거래일에 모든 사용자의 총 자산 스냅샷을 기록합니다."

    def is_last_trading_day_of_month(self, date_to_check: date) -> bool:
        """
        pykrx를 사용하여 주어진 날짜가 해당 월의 마지막 '거래일'인지 확인합니다.
        """
        year = date_to_check.year
        month = date_to_check.month

        # 1. 해당 월의 첫날과 마지막 날 구하기
        first_day_str = f"{year}{month:02d}01"
        _, last_day_num = calendar.monthrange(year, month)
        last_day_str = f"{year}{month:02d}{last_day_num}"

        try:
            # 2. pykrx를 이용해 해당 월의 모든 '거래일' 목록 가져오기 (DatetimeIndex)
            #    get_market_ohlcv_by_date는 날짜 범위를 주면 그 사이의 거래일만 반환함
            #    KOSPI 대표 종목 '005930'(삼성전자) 기준으로 조회 (어떤 종목이든 상관없음)
            df = stock.get_market_ohlcv_by_date(
                fromdate=first_day_str, todate=last_day_str, ticker="005930"
            )

            # 거래일이 없는 경우 (예: 해당 월 전체가 휴장)
            if df.empty:
                logger.warning(f"{year}년 {month}월에는 거래일이 없습니다.")
                return False

            # 3. 마지막 거래일(Timestamp) 추출 후 date 객체로 변환
            last_trading_day = df.index[-1].date()

            # 4. 주어진 날짜와 마지막 거래일 비교
            is_last = date_to_check == last_trading_day

            if is_last:
                logger.info(f"{date_to_check}은(는) {month}월의 마지막 거래일입니다.")
            else:
                logger.info(
                    f"{date_to_check}은(는) {month}월의 마지막 거래일이 아닙니다 (실제 마지막 거래일: {last_trading_day})."
                )

            return is_last

        except Exception as e:
            # pykrx 사용 중 에러 발생 시 (네트워크 등)
            logger.error(f"pykrx로 마지막 거래일 확인 중 오류 발생: {e}")
            # 안전하게 False 반환 (스냅샷 실행 안 함)
            return False

    def handle(self, *args, **options):
        today = timezone.now().date()

        # [수정] '마지막 거래일'이 아닐 경우 stdout으로 출력하고 종료
        if not self.is_last_trading_day_of_month(today):
            # logger.info 대신 self.stdout.write로 변경
            message = (
                f"{today}은(는) 마지막 거래일이 아니므로 스냅샷을 기록하지 않습니다."
            )
            self.stdout.write(message)
            return  # [중요] 여기서 종료

        logger.info(f"[{today}] 월말 자산 스냅샷 기록 작업을 시작합니다.")

        users = User.objects.filter(is_active=True)
        total_users = users.count()
        processed_users = 0
        errors = []

        for user in users:
            try:
                # 1. 총 주식 평가액 계산 (기존 로직 동일)
                total_stock_value = Decimal("0.00")
                portfolio_items = Portfolio.objects.filter(
                    user=user, total_quantity__gt=0
                )

                for item in portfolio_items:
                    try:
                        current_price = get_current_stock_price_for_trading(
                            item.stock.stock_code
                        )
                        if current_price is not None:
                            total_stock_value += current_price * item.total_quantity
                        else:
                            logger.warning(
                                f"경고: {user.email}의 {item.stock.stock_name} 현재가 조회 실패."
                            )
                    except Exception as price_error:
                        logger.error(
                            f"에러: {user.email}의 {item.stock.stock_name} 가격 조회 중 오류: {price_error}"
                        )

                # 2. 총 자산 계산 (기존 로직 동일)
                total_asset = total_stock_value + user.cash_balance

                # 3. DB에 저장 (기존 로직 동일)
                with db_transaction.atomic():
                    AssetHistory.objects.update_or_create(
                        user=user,
                        snapshot_date=today,
                        defaults={"total_asset": total_asset},
                    )

                processed_users += 1
                if processed_users % 10 == 0:
                    logger.info(f"... {processed_users}/{total_users} 명 처리 완료 ...")

            except Exception as e:
                error_msg = (
                    f"에러: 사용자 {user.email}의 자산 스냅샷 기록 중 오류 발생: {e}"
                )
                logger.error(error_msg)
                errors.append(error_msg)

        result_message = (
            f"총 {total_users}명 중 {processed_users}명의 자산 스냅샷 기록 완료!"
        )
        if errors:
            result_message += f" ({len(errors)}명 처리 중 오류 발생)"
            logger.error(
                f"자산 스냅샷 작업 중 {len(errors)}개의 오류 발생:\n"
                + "\n".join(errors)
            )

        # [수정] logger.info(result_message) 대신 self.stdout.write 사용
        if errors:
            self.stdout.write(self.style.ERROR(result_message))
        else:
            self.stdout.write(self.style.SUCCESS(result_message))
