# backend/stocks/views.py

import requests
from bs4 import BeautifulSoup
# Django Rest Framework의 APIView와 Response를 사용합니다.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import urllib.parse
from .models import Stock
import logging
import re
import time
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

logger = logging.getLogger(__name__)


# ================================================================
# ✨ [신규 추가] 거래(Trading) 앱을 위한 헬퍼 함수
# ================================================================
def get_current_stock_price_for_trading(stock_code: str) -> Decimal:
    """
    [거래 로직 전용 함수]
    주문 처리에 필요한 '현재가'만 빠르게 크롤링하여 Decimal 타입으로 반환합니다.
    이 함수는 trading 앱에서 직접 임포트하여 사용합니다.
    """
    url = f'https://finance.naver.com/item/sise.naver?code={stock_code}'
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # 네이버 증권의 현재가 ID 선택자
        price_strong = soup.select_one('#_nowVal')
        if not price_strong:
            raise ValueError(f"'{stock_code}'의 현재가 정보를 찾을 수 없습니다.")

        price_str = price_strong.get_text(strip=True).replace(',', '')
        return Decimal(price_str)

    except requests.exceptions.RequestException as e:
        # 이 에러들은 주문 실패로 이어져야 하므로, 다시 raise 합니다.
        raise ConnectionError(f"네이버 금융 서버 요청 실패: {e}")
    except (ValueError, InvalidOperation, AttributeError) as e:
        raise ValueError(f"'{stock_code}'의 현재가 파싱 중 오류 발생: {e}")

def parse_change_data(change_element):
    """
    등락률 정보를 담은 HTML 요소를 파싱하여 딕셔너리로 반환하는 헬퍼 함수
    예: "91.09 +2.49%상승" -> {'change': '91.09', 'change_percent': '+2.49%', 'status': '상승'}
    """
    full_text = change_element.get_text(strip=True)
    status_text = change_element.find('span', class_='blind').get_text(strip=True) # "상승" 또는 "하락"
    
    # "상승" 또는 "하락" 텍스트를 제외한 나머지 부분
    data_part = full_text.replace(status_text, '').strip()
    
    parts = data_part.split()
    change_value = parts[0]
    change_rate = parts[1] if len(parts) > 1 else ""

    return {
        "change": change_value,
        "change_percent": change_rate,
        "status": status_text,
    }


class MarketIndexView(APIView):
    """
    네이버 금융에서 KOSPI, KOSDAQ 지수와 차트 정보를 스크래핑하는 API
    """
    def get(self, request, *args, **kwargs):
        url = 'https://finance.naver.com/sise/'
        headers = {'User-Agent': 'Mozilla/5.0'}

        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')

            # --- KOSPI 데이터 추출 ---
            kospi_now = soup.select_one('#KOSPI_now').get_text(strip=True)
            kospi_change_element = soup.select_one('#KOSPI_change')
            kospi_change_data = parse_change_data(kospi_change_element)
            kospi_chart_url = soup.select_one('#tab_sel1_sise_main_chart img')['src']

            # --- KOSDAQ 데이터 추출 ---
            kosdaq_now = soup.select_one('#KOSDAQ_now').get_text(strip=True)
            kosdaq_change_element = soup.select_one('#KOSDAQ_change')
            kosdaq_change_data = parse_change_data(kosdaq_change_element)
            kosdaq_chart_url = soup.select_one('#tab_sel2_sise_main_chart img')['src']

            # --- 최종 데이터 구조화 ---
            data = {
                "kospi": {
                    "index": kospi_now,
                    "change": kospi_change_data['change'],
                    "change_percent": kospi_change_data['change_percent'],
                    "status": kospi_change_data['status'],
                    "chart_url": kospi_chart_url
                },
                "kosdaq": {
                    "index": kosdaq_now,
                    "change": kosdaq_change_data['change'],
                    "change_percent": kosdaq_change_data['change_percent'],
                    "status": kosdaq_change_data['status'],
                    "chart_url": kosdaq_chart_url
                }
            }
            
            # 성공적으로 데이터를 가져오면 JSON 형태로 반환
            return Response(data, status=status.HTTP_200_OK)

        except requests.exceptions.RequestException as e:
            return Response({"error": f"네이버 금융 서버 요청 실패: {e}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return Response({"error": f"데이터 파싱 중 오류 발생: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class StockSearchView(APIView):
    """
    쿼리 파라미터로 받은 검색어로 주식을 검색하는 API.
    네이버 증권에서 검색된 결과를 기준으로, 우리 DB에 존재하는 종목만 필터링하여 반환합니다.
    """
    def get(self, request, *args, **kwargs):
        query = request.query_params.get('query', None)
        if not query:
            return Response({"error": "검색어('query')를 입력해주세요."}, status=status.HTTP_400_BAD_REQUEST)

        search_term = query
        # 종목 코드로 검색 시, DB에서 종목명을 찾아 검색어로 사용
        if query.isdigit() and len(query) == 6:
            try:
                stock = Stock.objects.get(stock_code=query)
                search_term = stock.stock_name
            except Stock.DoesNotExist:
                pass
        
        encoded_query = urllib.parse.quote(search_term, encoding='euc-kr')
        url = f'https://finance.naver.com/search/search.naver?query={encoded_query}'
        headers = {'User-Agent': 'Mozilla/5.0'}

        try:
            # (기존의 네이버 목록 검색 및 DB 필터링 로직)
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            search_table = soup.find('table', class_='tbl_search', summary='국내종목 검색 결과')
            if not search_table: return Response([], status=status.HTTP_200_OK)
            
            scraped_results = []
            stock_rows = search_table.find('tbody').find_all('tr')
            for row in stock_rows:
                columns = row.find_all('td')
                if len(columns) < 3: continue
                name_tag = columns[0].find('a')
                if not name_tag: continue
                name = name_tag.get_text(strip=True)
                code = name_tag['href'].split('code=')[1]
                price = columns[1].get_text(strip=True)
                change_rate_text = columns[2].get_text(strip=True).replace('%', '')
                try:
                    change_rate = float(change_rate_text)
                except ValueError:
                    change_rate = 0.0
                scraped_results.append({"name": name, "code": code, "price": price, "changeRate": change_rate})
            
            if not scraped_results: return Response([], status=status.HTTP_200_OK)
            
            scraped_codes = [item['code'] for item in scraped_results]
            existing_codes_in_db = set(Stock.objects.filter(stock_code__in=scraped_codes).values_list('stock_code', flat=True))
            final_results = [item for item in scraped_results if item['code'] in existing_codes_in_db]

            return Response(final_results, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"💥 종목명({query}) 처리 중 예외 발생: {e}")
            return Response({"error": f"목록 페이지 처리 중 오류: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            



# ----------------------------------------------------------------
# ✨ API 3: 주식 상세 정보 페이지 (sise.naver 페이지 크롤링 버전)
# ----------------------------------------------------------------
# ----------------------------------------------------------------
# ✨ API 3: 주식 상세 정보 페이지 (핵심 정보만 반환)
# ----------------------------------------------------------------
class StockDetailView(APIView):
    """
    종목 코드를 받아 해당 종목의 핵심 시세 정보, 차트,
    5단계/10단계 호가 정보를 반환합니다.
    """

    def _parse_order_book(self, soup, ask_type):
        """
        [수정됨] 5단계/10단계 HTML 구조를 구분하여
        호가창 정보를 파싱하는 헬퍼 메서드
        """
        asks = [] # 매도
        bids = [] # 매수
        total_ask_vol = ""
        total_bid_vol = ""

        order_book_table = soup.select_one('table.type2[summary="호가 정보에 관한표입니다."]')
        
        if order_book_table:
            rows = order_book_table.select('tbody > tr')
            
            if ask_type == 10:
                # --- 10단계 파서 (한 행에 매도/매수가 모두 있음) ---
                data_rows = [r for r in rows if r.select('td.bg01') and r.select('td.bg02')]
                for row in reversed(data_rows): # 매도는 가격 높은 순 -> 낮은 순
                    ask_cols = row.select('td.bg01')
                    if len(ask_cols) == 2:
                        asks.append({"price": ask_cols[1].get_text(strip=True), "volume": ask_cols[0].get_text(strip=True)})
                
                for row in data_rows: # 매수는 가격 높은 순 -> 낮은 순
                    bid_cols = row.select('td.bg02')
                    if len(bid_cols) == 2:
                        bids.append({"price": bid_cols[0].get_text(strip=True), "volume": bid_cols[1].get_text(strip=True)})
            
            else:
                # --- 5단계 파서 (매도/매수 행이 분리됨) ---
                ask_rows = [r for r in rows if r.select('td.bg01') and not r.select('td.bg02')]
                for row in reversed(ask_rows):
                    cols = row.select('td.bg01')
                    if len(cols) == 2:
                        asks.append({"price": cols[1].get_text(strip=True), "volume": cols[0].get_text(strip=True)})
                
                bid_rows = [r for r in rows if r.select('td.bg02') and not r.select('td.bg01')]
                for row in bid_rows:
                    cols = row.select('td.bg02')
                    if len(cols) == 2:
                        bids.append({"price": cols[0].get_text(strip=True), "volume": cols[1].get_text(strip=True)})

        # --- 잔량합계 파싱 (공통) ---
        totals_table = soup.select_one('table.type2[summary="호가 정보에 관한표입니다."] + table.type2')
        if totals_table:
            total_ask_vol_element = totals_table.select_one('td.bor strong')
            if total_ask_vol_element:
                total_ask_vol = total_ask_vol_element.get_text(strip=True)
            
            total_bid_vol_element = totals_table.select_one('th.num strong')
            if total_bid_vol_element:
                total_bid_vol = total_bid_vol_element.get_text(strip=True)

        return {
            "asks": asks, "bids": bids,
            "total_ask_volume": total_ask_vol, "total_bid_volume": total_bid_vol
        }


    def get(self, request, stockCode, *args, **kwargs):
        headers = {'User-Agent': 'Mozilla/5.0'}

        try:
            # --- 1. [수정] 5단계 호가 요청 (기본 페이지) ---
            url_5step = f'https://finance.naver.com/item/sise.naver?code={stockCode}&asktype=5'
            response_5step = requests.get(url_5step, headers=headers)
            response_5step.raise_for_status()
            soup_5step = BeautifulSoup(response_5step.text, 'html.parser')

            # --- 2. 헤더 정보 파싱 (5단계 페이지에서) ---
            rate_info = soup_5step.select_one('div#rate_info_krx')
            if not rate_info:
                return Response({"error": "페이지 구조가 변경되었거나 잘못된 종목 코드입니다."}, status=500)
            
            # (헤더 파싱 로직은 동일)
            all_ems = rate_info.select('em[class*="no_"]')
            price_em, change_price_em, change_rate_em = all_ems[0], all_ems[1], all_ems[2]
            price = parse_span_numbers(price_em.select('span[class*="no"], span[class*="shim"]'))
            status_text = change_price_em.select_one('span.ico').get_text(strip=True) if change_price_em.select_one('span.ico') else "보합"
            change = parse_span_numbers(change_price_em.select('span[class*="no"]'))
            sign = parse_sign(change_rate_em.select_one('span.ico'))
            change_rate = sign + parse_span_numbers(change_rate_em.select('span[class*="no"], span[class*="jum"]')) + "%"
            name = soup_5step.title.get_text().split(' : ')[0]

            # --- 3. 차트 URL 생성 ---
            base_chart_url = "https://ssl.pstatic.net/imgfinance/chart/item/candle"
            chart_data = {
                "day": f"{base_chart_url}/day/{stockCode}.png",
                "week": f"{base_chart_url}/week/{stockCode}.png",
                "month": f"{base_chart_url}/month/{stockCode}.png"
            }

            # --- 4. 5단계 호가 정보 파싱 ---
            order_book_5 = self._parse_order_book(soup_5step, ask_type=5)

            # --- 5. [수정] 10단계 호가 정보 파싱 (별도 요청) ---
            url_10step = f'https://finance.naver.com/item/sise.naver?code={stockCode}&asktype=10'
            response_10step = requests.get(url_10step, headers=headers)
            soup_10step = BeautifulSoup(response_10step.text, 'html.parser')
            order_book_10 = self._parse_order_book(soup_10step, ask_type=10)
            
            # --- 6. 최종 데이터 조합 ---
            data = {
                "name": name, "code": stockCode, "price": price, "change": change,
                "change_rate": change_rate, "status": status_text,
                "charts": chart_data,
                "order_book_5": order_book_5,
                "order_book_10": order_book_10
            }
            
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"💥 상세 정보({stockCode}) 처리 중 예외 발생: {e}") 
            return Response({"error": f"상세 페이지 처리 중 오류: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 헬퍼 함수 (로그 제거)
def parse_span_numbers(span_elements):
    number_str = ""
    for span in span_elements:
        class_list = span.get('class', [])
        if not class_list:
            continue
        
        class_name = class_list[0]
        if 'no' in class_name:
            digit = class_name.replace('no', '')
            number_str += digit
        elif 'jum' in class_name:
            number_str += '.'
        elif 'shim' in class_name:
            number_str += ','
            
    return number_str

# 헬퍼 함수 (로그 제거)
def parse_sign(span_element):
    if span_element is None:
        return ''
    
    class_list = span_element.get('class', [])
    
    if 'plus' in class_list:
        return '+'
    elif 'minus' in class_list:
        return '-'
    
    return ''



# ----------------------------------------------------------------
# ✨ [신규] API 4: 시간별 시세 조회 (페이지네이션)
# ----------------------------------------------------------------


class StockTimeTicksView(APIView):
    """
    종목 코드와 페이지 번호를 받아 '시간별 시세' 데이터를 반환합니다.
    """
    def get(self, request, stockCode, page, *args, **kwargs):

        # ✨ [개선 1] thistime을 동적으로 생성합니다.
        # 오늘 날짜를 가져옵니다.
        now = datetime.now()
        # 만약 오늘이 토요일(5)이나 일요일(6)이라면, 가장 최근의 금요일로 날짜를 맞춥니다.
        if now.weekday() == 5: # 토요일
            now -= timedelta(days=1)
        elif now.weekday() == 6: # 일요일
            now -= timedelta(days=2)
        
        # YYYYMMDD180000 형식으로 포맷팅 (장 마감 이후 시간으로 넉넉하게 설정)
        thistime_str = now.strftime('%Y%m%d') + '180000'

        url = f'https://finance.naver.com/item/sise_time.naver?code={stockCode}&page={page}&thistime={thistime_str}'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            'Referer': f'https://finance.naver.com/item/sise.naver?code={stockCode}',
        }

        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')

            ticks_data = []
            tick_rows = soup.select('table.type2 > tr[onmouseover]')
            print(f"Page {page} for {stockCode} ({thistime_str}): Found {len(tick_rows)} rows")

            for row in tick_rows:
                cols = row.select('td')
                if len(cols) != 7:
                    continue

                try:
                    # ✨ [개선 2] 더 안정적인 파싱 로직으로 복귀
                    # ✨ [핵심 수정] 변수 'time'을 'tick_time'으로 변경하여 충돌 방지
                    tick_time = cols[0].get_text(strip=True)
                    price = cols[1].get_text(strip=True)
                    
                    change_status_span = cols[2].select_one('em span.blind')
                    change_status = change_status_span.get_text(strip=True) if change_status_span else ""
                    change = cols[2].get_text(strip=True).replace(change_status, '').strip()
                    
                    sell_price = cols[3].get_text(strip=True)
                    buy_price = cols[4].get_text(strip=True)
                    volume = cols[5].get_text(strip=True)
                    volume_change = cols[6].get_text(strip=True)

                    if not tick_time or not price:
                        # 이 로그는 이제 페이지 하단의 진짜 빈 줄에만 나타날 것입니다.
                        print(f"Skipping empty row: {row.get_text(strip=True)}")
                        continue

                    ticks_data.append({
                        "time": tick_time,
                        "price": price,
                        "change": change,
                        "change_status": change_status,
                        "sell_price": sell_price,
                        "buy_price": buy_price,
                        "volume": volume,
                        "volume_change": volume_change,
                    })
                except Exception as ex:
                    print(f"Skipping row due to parsing error: {ex} in row: {row.get_text(strip=True)}")
                    continue
            
            # ✨ [핵심 수정] time 모듈을 직접 호출
            time.sleep(0.5)  # 과도한 요청을 막기 위해 약간의 딜레이를 줍니다 (1초는 너무 길 수 있습니다).

            if not ticks_data:
                print(f"No valid data found on page {page}")
            
            return Response(ticks_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"💥 시간별 시세({stockCode}, page={page}) 처리 중 예외 발생: {e}")
            return Response({"error": f"시간별 시세 처리 중 오류: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ----------------------------------------------------------------
# ✨ [신규] API 5: 일별 시세 조회 (페이지네이션)
# ----------------------------------------------------------------
class StockDailyPriceView(APIView):
    """
    종목 코드와 페이지 번호를 받아 '일별 시세' 데이터를 반환합니다.
    """
    def get(self, request, stockCode, page, *args, **kwargs):
        url = f'https://finance.naver.com/item/sise_day.naver?code={stockCode}&page={page}'
        headers = {'User-Agent': 'Mozilla.5.0'}

        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')

            daily_data = []
            daily_rows = soup.select('table.type2 > tr[onmouseover]')

            for row in daily_rows:
                cols = row.select('td')
                if len(cols) != 7:
                    continue

                # --- ✨ [핵심 수정] ---
                # cols[2] ('전일비' td) 안에서 'em span.blind'를 직접 찾습니다.
                change_status_span = cols[2].select_one('em span.blind')
                change_status = change_status_span.get_text(strip=True) if change_status_span else ""
                # ---------------------

                # 종가(close)와 전일비(change) 값은 그대로 가져옵니다.
                close_price = cols[1].get_text(strip=True)
                change_value = cols[2].get_text(strip=True).replace(change_status, '').strip() # 상태 텍스트 제거

                daily_data.append({
                    "date": cols[0].get_text(strip=True),
                    "close": close_price,
                    "change": change_value,
                    "change_status": change_status, # <-- 이제 "상승" 또는 "하락"이 들어갑니다.
                    "open": cols[3].get_text(strip=True),
                    "high": cols[4].get_text(strip=True),
                    "low": cols[5].get_text(strip=True),
                    "volume": cols[6].get_text(strip=True),
                })

            return Response(daily_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"일별 시세 처리 중 오류: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)