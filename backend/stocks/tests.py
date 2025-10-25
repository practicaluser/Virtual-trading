from decimal import Decimal
from unittest.mock import patch

import requests
from bs4 import BeautifulSoup
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APITestCase

from .models import Stock

# [추가] views.py에서 테스트할 함수 및 헬퍼 함수 임포트
from .views import (
    get_current_stock_price_for_trading,
    parse_change_data,
    parse_sign,
    parse_span_numbers,
)

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


# --- 테스트를 위한 가짜 HTML 데이터 ---

# [추가] MarketIndexView를 위한 가짜 HTML
FAKE_NAVER_MAIN_HTML = """
<html>
<body>
    <span id="KOSPI_now">2,500.00</span>
    <span id="KOSPI_change">91.09 <span class="blind">상승</span></span>
    <div id="tab_sel1_sise_main_chart"><img src="/fake_kospi_chart.png"></div>
    
    <span id="KOSDAQ_now">800.00</span>
    <span id="KOSDAQ_change">2.49 <span class="blind">하락</span></span>
    <div id="tab_sel2_sise_main_chart"><img src="/fake_kosdaq_chart.png"></div>
</body>
</html>
"""

# [추가] get_current_stock_price_for_trading을 위한 가짜 HTML
FAKE_NAVER_PRICE_HTML = """
<html>
<body>
    <strong id="_nowVal">80,000</strong>
</body>
</html>
"""

# [추가] StockSearchView를 위한 가짜 HTML
FAKE_NAVER_SEARCH_HTML = """
<html>
<body>
    <table class="tbl_search" summary="국내종목 검색 결과">
        <tbody>
            <tr>
                <td><a href="/item/main.naver?code=005930">삼성전자</a></td>
                <td>80,000</td>
                <td>-1.23%</td>
            </tr>
            <tr>
                <td><a href="/item/main.naver?code=000660">SK하이닉스</a></td>
                <td>150,000</td>
                <td>+2.00%</td>
            </tr>
        </tbody>
    </table>
</body>
</html>
"""

# [추가] StockDetailView (5단계 호가)
FAKE_NAVER_DETAIL_5STEP_HTML = """
<html>
<head><title>삼성전자 : 네이버 증권</title></head>
<body>
    <div id="rate_info_krx">
        <em class="no_down"><span class="no8">8</span><span class="no0">0</span><span class="shim">,</span><span class="no0">0</span><span class="no0">0</span><span class="no0">0</span></em>
        <em class="no_down"><span class="ico minus"></span><span class="no1">1</span><span class="shim">,</span><span class="no0">0</span><span class="no0">0</span><span class="no0">0</span></em>
        <em class="no_down"><span class="ico minus"></span><span class="no1">1</span><span class="jum">.</span><span class="no2">2</span><span class="no3">3</span>%</em>
    </div>
    
    <table class="type2" summary="호가 정보에 관한표입니다.">
        <tbody>
            <tr class="bg"> </tr>
            <tr><td class="bg01">80,200</td><td class="bg01">100</td></tr>
            <tr><td class="bg01">80,100</td><td class="bg01">50</td></tr>
            <tr><td class="bg02">79,900</td><td class="bg02">200</td></tr>
            <tr><td class="bg02">79,800</td><td class="bg02">300</td></tr>
        </tbody>
    </table>
    <table class="type2"> <tbody>
            <tr><td class="bor"><strong>150</strong></td><th class="num"><strong>500</strong></th></tr>
        </tbody>
    </table>
</body>
</html>
"""

# [추가] StockDetailView (10단계 호가)
FAKE_NAVER_DETAIL_10STEP_HTML = """
<html>
<body>
    <table class="type2" summary="호가 정보에 관한표입니다.">
        <tbody>
            <tr> <td class="bg01">5</td> <td class="bg01">80,500</td> <td class="bg02">79,500</td> <td class="bg02">10</td> </tr>
            <tr> <td class="bg01">10</td> <td class="bg01">80,400</td> <td class="bg02">79,400</td> <td class="bg02">20</td> </tr>
        </tbody>
    </table>
    <table class="type2"> <tbody>
            <tr><td class="bor"><strong>15</strong></td><th class="num"><strong>30</strong></th></tr>
        </tbody>
    </table>
</body>
</html>
"""


# ================================================================
# 1. 헬퍼 함수 테스트 (View 외부 함수)
# ================================================================
class HelperFunctionTests(TestCase):
    """
    views.py에 정의된 헬퍼 함수들을 테스트합니다.
    (parse_span_numbers, parse_sign, parse_change_data, get_current_stock_price_for_trading)
    """

    def test_get_current_stock_price_for_trading_success(self):
        """
        [get_current_stock_price_for_trading] 성공 케이스:
        가짜 HTML을 반환하도록 patch하고, Decimal 타입으로 가격을 잘 반환하는지 확인
        """
        stock_code = "005930"

        # 'stocks.views.requests.get'을 mock 객체로 대체
        with patch("stocks.views.requests.get") as mock_get:
            # mock_get이 MockResponse 객체를 반환하도록 설정
            mock_get.return_value = MockResponse(FAKE_NAVER_PRICE_HTML, 200)

            # 함수 실행
            price = get_current_stock_price_for_trading(stock_code)

            # 결과 검증
            self.assertEqual(price, Decimal("80000"))
            # mock_get이 올바른 URL로 호출되었는지 검증
            mock_get.assert_called_once_with(
                f"https://finance.naver.com/item/sise.naver?code={stock_code}",
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=5,
            )

    def test_get_current_stock_price_for_trading_request_failure(self):
        """
        [get_current_stock_price_for_trading] 실패 케이스 1:
        네트워크 요청 실패 시 (e.g., 404, 500) ConnectionError를 발생시키는지 확인
        """
        # requests.get이 RequestException을 발생시키도록 설정
        with patch(
            "stocks.views.requests.get",
            side_effect=requests.exceptions.RequestException("Test Error"),
        ):
            # self.assertRaises(예외, 함수, *args)
            with self.assertRaises(ConnectionError):
                get_current_stock_price_for_trading("005930")

    def test_get_current_stock_price_for_trading_parsing_failure(self):
        """
        [get_current_stock_price_for_trading] 실패 케이스 2:
        HTML 구조가 변경되어 #_nowVal ID를 찾지 못할 때 ValueError를 발생시키는지 확인
        """
        # 비어있는 HTML 반환
        with patch("stocks.views.requests.get") as mock_get:
            mock_get.return_value = MockResponse("<html></html>", 200)

            with self.assertRaises(ValueError):
                get_current_stock_price_for_trading("005930")

    def test_parse_change_data(self):
        """
        [parse_change_data] '상승' 또는 '하락' 텍스트를 파싱하는지 테스트
        """
        # 가짜 BeautifulSoup 요소 생성
        html = '<span>91.09 +2.49%<span class="blind">상승</span></span>'
        soup = BeautifulSoup(html, "html.parser")
        element = soup.find("span")

        result = parse_change_data(element)
        self.assertEqual(
            result,
            {
                "change": "91.09",
                "change_percent": "+2.49%",
                "status": "상승",
            },
        )

    def test_parse_span_numbers(self):
        """
        [parse_span_numbers] class="noX" 형태의 span을 숫자로 변환하는지 테스트
        """
        html = '<span class="no1"></span><span class="no2"></span><span class="shim">,</span><span class="no3"></span><span class="jum">.</span><span class="no4"></span>'
        soup = BeautifulSoup(html, "html.parser")
        elements = soup.select("span")

        result = parse_span_numbers(elements)
        self.assertEqual(result, "12,3.4")

    def test_parse_sign(self):
        """
        [parse_sign] class="plus" 또는 "minus"를 부호로 변환하는지 테스트
        """
        html_plus = '<span class="ico plus"></span>'
        soup_plus = BeautifulSoup(html_plus, "html.parser")
        result_plus = parse_sign(soup_plus.find("span"))
        self.assertEqual(result_plus, "+")

        html_minus = '<span class="ico minus"></span>'
        soup_minus = BeautifulSoup(html_minus, "html.parser")
        result_minus = parse_sign(soup_minus.find("span"))
        self.assertEqual(result_minus, "-")

        html_none = '<span class="ico"></span>'
        soup_none = BeautifulSoup(html_none, "html.parser")
        result_none = parse_sign(soup_none.find("span"))
        self.assertEqual(result_none, "")


# ================================================================
# 2. APIView 테스트 (APITestCase 사용)
# ================================================================


class MarketIndexViewTest(APITestCase):
    """
    MarketIndexView (코스피/코스닥 지수) API를 테스트합니다.
    """

    # 'stocks.views' 모듈의 requests.get을 mock_get으로 대체
    @patch("stocks.views.requests.get")
    def test_market_index_success(self, mock_get):
        """
        [MarketIndexView] 성공 케이스:
        API 호출 시 가짜 HTML을 파싱하여 KOSPI, KOSDAQ 정보를 반환하는지 확인
        """
        # mock_get이 가짜 메인 HTML을 반환하도록 설정
        mock_get.return_value = MockResponse(FAKE_NAVER_MAIN_HTML, 200)

        # APITestCase의 self.client를 사용하여 API 요청
        # (주의: URL은 실제 `urls.py` 설정에 맞게 수정해야 할 수 있습니다)
        response = self.client.get("/api/stocks/market-index/")

        # 1. 응답 상태 코드 확인
        self.assertEqual(response.status_code, 200)

        # 2. 응답 데이터 구조 확인
        data = response.data
        self.assertIn("kospi", data)
        self.assertIn("kosdaq", data)

        # 3. KOSPI 데이터 파싱 확인
        self.assertEqual(data["kospi"]["index"], "2,500.00")
        self.assertEqual(data["kospi"]["change"], "91.09")
        self.assertEqual(data["kospi"]["status"], "상승")
        self.assertEqual(data["kospi"]["chart_url"], "/fake_kospi_chart.png")

        # 4. KOSDAQ 데이터 파싱 확인
        self.assertEqual(data["kosdaq"]["index"], "800.00")
        self.assertEqual(data["kosdaq"]["change"], "2.49")
        self.assertEqual(data["kosdaq"]["status"], "하락")

    @patch("stocks.views.requests.get")
    def test_market_index_request_failure(self, mock_get):
        """
        [MarketIndexView] 실패 케이스:
        네트워크 요청 실패 시 503 (SERVICE_UNAVAILABLE) 상태 코드를 반환하는지 확인
        """
        mock_get.side_effect = requests.exceptions.RequestException(
            "Test Network Error"
        )

        response = self.client.get("/api/stocks/market-index/")

        self.assertEqual(response.status_code, 503)
        self.assertIn("error", response.data)
        self.assertIn("네이버 금융 서버 요청 실패", response.data["error"])

    @patch("stocks.views.requests.get")
    def test_market_index_parsing_failure(self, mock_get):
        """
        [MarketIndexView] 실패 케이스:
        HTML 구조가 변경되어 파싱 실패 시 500 (INTERNAL_SERVER_ERROR) 상태 코드를 반환하는지 확인
        """
        # KOSPI_now가 없는 비어있는 HTML 반환
        mock_get.return_value = MockResponse("<html></html>", 200)

        response = self.client.get("/api/stocks/market-index/")

        self.assertEqual(response.status_code, 500)
        self.assertIn("error", response.data)
        self.assertIn("데이터 파싱 중 오류 발생", response.data["error"])


class StockSearchViewTest(APITestCase):
    """
    StockSearchView (주식 검색) API를 테스트합니다.
    """

    def setUp(self):
        # 테스트를 위해 DB에 '삼성전자' 주식을 미리 생성
        Stock.objects.create(
            stock_code="005930", stock_name="삼성전자", market_type="KOSPI"
        )
        # 'SK하이닉스'는 DB에 없다고 가정

    def test_search_no_query(self):
        """
        [StockSearchView] 실패 케이스:
        'query' 파라미터 없이 요청 시 400 (BAD_REQUEST)을 반환하는지 확인
        """
        response = self.client.get("/api/stocks/search/")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, {"error": "검색어('query')를 입력해주세요."})

    @patch("stocks.views.requests.get")
    def test_search_success_and_db_filter(self, mock_get):
        """
        [StockSearchView] 성공 케이스:
        '삼성'으로 검색 시, 네이버에서 2개(삼성전자, SK하이닉스)를 찾고,
        DB와 비교 필터링하여 '삼성전자' 1개만 반환하는지 확인
        """
        mock_get.return_value = MockResponse(FAKE_NAVER_SEARCH_HTML, 200)

        response = self.client.get("/api/stocks/search/?query=삼성")

        self.assertEqual(response.status_code, 200)

        # 네이버 검색 결과는 2개였지만, DB에 있는 '삼성전자' 1개만 반환되어야 함
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "삼성전자")
        self.assertEqual(response.data[0]["code"], "005930")

    @patch("stocks.views.requests.get")
    def test_search_by_code(self, mock_get):
        """
        [StockSearchView] 성공 케이스:
        '005930' 코드로 검색 시, DB에서 '삼성전자' 이름을 찾아 네이버에 검색하는지 확인
        """
        mock_get.return_value = MockResponse(FAKE_NAVER_SEARCH_HTML, 200)

        response = self.client.get("/api/stocks/search/?query=005930")

        self.assertEqual(response.status_code, 200)

        # '005930' 코드로 DB를 조회하여 '삼성전자'로 변환한 뒤,
        # 'euc-kr'로 인코딩하여 네이버에 요청했는지 확인
        encoded_query = "https://finance.naver.com/search/search.naver?query=%BB%EF%BC%BA%C0%FC%C0%DA"
        called_url = mock_get.call_args[0][0]  # mock_get이 호출된 첫 번째 인자(URL)

        # 실제 호출된 URL과 예상 URL이 동일한지 확인
        self.assertEqual(called_url, encoded_query)
        self.assertEqual(response.data[0]["name"], "삼성전자")


class StockDetailViewTest(APITestCase):
    """
    StockDetailView (주식 상세) API를 테스트합니다.
    (주의: 이 View는 2번의 requests.get()을 호출합니다)
    """

    @patch("stocks.views.requests.get")
    def test_stock_detail_success(self, mock_get):
        """
        [StockDetailView] 성공 케이스:
        5단계, 10단계 호가 HTML을 순차적으로 반환하도록 side_effect를 설정하고,
        모든 데이터가 정상적으로 파싱되는지 확인
        """
        # 1. 첫 번째 호출(5단계) -> 5단계 HTML 반환
        # 2. 두 번째 호출(10단계) -> 10단계 HTML 반환
        mock_get.side_effect = [
            MockResponse(FAKE_NAVER_DETAIL_5STEP_HTML, 200),
            MockResponse(FAKE_NAVER_DETAIL_10STEP_HTML, 200),
        ]

        response = self.client.get("/api/stocks/detail/005930/")

        self.assertEqual(response.status_code, 200)

        data = response.data

        # 1. 헤더 정보 파싱 확인
        self.assertEqual(data["name"], "삼성전자")
        self.assertEqual(data["price"], "80,000")
        self.assertEqual(data["change"], "1000")
        self.assertEqual(data["change_rate"], "-1.23%")
        self.assertEqual(data["status"], "")

        # 2. 5단계 호가 파싱 확인
        self.assertEqual(len(data["order_book_5"]["asks"]), 2)
        self.assertEqual(len(data["order_book_5"]["bids"]), 2)
        self.assertEqual(data["order_book_5"]["total_ask_volume"], "150")
        self.assertEqual(data["order_book_5"]["total_bid_volume"], "500")
        self.assertEqual(data["order_book_5"]["asks"][0]["price"], "50")

        # 3. 10단계 호가 파싱 확인
        self.assertEqual(len(data["order_book_10"]["asks"]), 2)
        self.assertEqual(len(data["order_book_10"]["bids"]), 2)
        self.assertEqual(data["order_book_10"]["total_ask_volume"], "15")
        self.assertEqual(data["order_book_10"]["total_bid_volume"], "30")
        self.assertEqual(
            data["order_book_10"]["bids"][0]["price"], "79,500"
        )  # 순서대로 정렬됨


# (참고) StockTimeTicksView, StockDailyPriceView 테스트
# 위와 동일한 방식으로 가짜 HTML을 정의하고,
# APITestCase를 상속받는 테스트 클래스를 만들어
# /api/stocks/ticks/005930/1/
# /api/stocks/daily/005930/1/
# 등의 엔드포인트를 테스트하면 됩니다.
