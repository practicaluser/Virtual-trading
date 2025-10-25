from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from .models import Stock

# --- 테스트를 위한 가짜 HTML 데이터 ---
# 이 HTML은 실제 네이버의 구조를 단순화한 버전입니다.
# 1. '삼성전자' (이름 업데이트 대상)
# 2. '카카오' (변경 없음)
# 3. '현대차' (신규 상장 대상)
FAKE_NAVER_FINANCE_HTML = """
<html>
<body>
    <table class="type_2">
        <tbody>
            <tr onmouseover="mouseOver(this)">
                <td>1</td>
                <td><a href="/item/main.naver?code=005930">삼성전자</a></td>
            </tr>
            <tr onmouseover="mouseOver(this)">
                <td>2</td>
                <td><a href="/item/main.naver?code=035720">카카오</a></td>
            </tr>
            <tr onmouseover="mouseOver(this)">
                <td>3</td>
                <td><a href="/item/main.naver?code=005380">현대차</a></td>
            </tr>
        </tbody>
    </table>
</body>
</html>
"""


# requests.get()이 반환할 가짜 응답(Response) 객체
class MockResponse:
    def __init__(self, text, status_code):
        self.text = text
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception("Client or Server Error")


class CrawlStocksCommandTest(TestCase):
    """
    'crawl_stocks' 관리자 명령어의 DB 동기화 로직을 테스트합니다.
    """

    # @patch 데코레이터를 사용하여 `requests.get`을 가짜(mock_get) 객체로 대체합니다.
    # 이 테스트 메서드가 실행되는 동안 `requests.get`은 실제 네트워크 요청을 보내지 않습니다.
    @patch("stocks.management.commands.crawl_stocks.requests.get")
    def test_sync_stocks_logic(self, mock_get):
        # 1. --- 사전 준비 (Setup) ---

        # 가짜 requests.get()이 우리가 만든 가짜 HTML을 담은 MockResponse를 반환하도록 설정합니다.
        mock_get.return_value = MockResponse(FAKE_NAVER_FINANCE_HTML, 200)

        # 테스트 시작 전, 데이터베이스의 초기 상태를 설정합니다.
        Stock.objects.create(
            stock_code="000001", stock_name="상장폐지된 주식", market_type="KOSPI"
        )
        Stock.objects.create(
            stock_code="005930", stock_name="삼성전자 (구형)", market_type="KOSPI"
        )
        Stock.objects.create(
            stock_code="035720", stock_name="카카오", market_type="KOSPI"
        )

        # 시작 전 DB 상태 확인 (총 3개)
        self.assertEqual(Stock.objects.count(), 3)

        # 2. --- 명령어 실행 (Action) ---

        # 'crawl_stocks' 명령어를 실행합니다.
        # 이 때 `requests.get`이 호출되면 mock_get이 대신 응답합니다.
        call_command("crawl_stocks")

        # 3. --- 결과 검증 (Assert) ---

        # (검증 1) 최종적으로 DB에 몇 개의 주식이 있어야 하는가?
        # '상장폐지'는 삭제되고 '현대차'는 추가되었으므로, 총 3개여야 합니다.
        self.assertEqual(Stock.objects.count(), 3)

        # (검증 2) '상장폐지된 주식'(000001)이 DB에서 삭제되었는지 확인합니다.
        self.assertFalse(
            Stock.objects.filter(stock_code="000001").exists(),
            "상장 폐지된 주식이 삭제되지 않았습니다.",
        )

        # (검증 3) '현대차'(005380)가 DB에 새로 추가되었는지 확인합니다.
        self.assertTrue(
            Stock.objects.filter(stock_code="005380").exists(),
            "신규 상장 주식이 추가되지 않았습니다.",
        )

        # (검증 4) '삼성전자'(005930)의 이름이 '삼성전자 (구형)'에서 '삼성전자'로 업데이트되었는지 확인합니다.
        samsung = Stock.objects.get(stock_code="005930")
        self.assertEqual(
            samsung.stock_name,
            "삼성전자",
            "기존 주식의 이름이 업데이트되지 않았습니다.",
        )

        # (검증 5) '카카오'(035720) 정보가 변경 없이 그대로 유지되는지 확인합니다.
        kakao = Stock.objects.get(stock_code="035720")
        self.assertEqual(kakao.stock_name, "카카오")

        print("\n[SUCCESS] crawl_stocks 명령어 동기화 테스트 통과!")
