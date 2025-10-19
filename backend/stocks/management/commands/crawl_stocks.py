import requests
import time
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from stocks.models import Stock

class Command(BaseCommand):
    help = '네이버 금융에서 KOSPI 주식 정보를 크롤링하여 데이터베이스에 동기화합니다.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('KOSPI 주식 정보 동기화를 시작합니다...'))

        # --- 1. 크롤링을 통해 최신 주식 정보 가져오기 ---
        crawled_stocks = {}
        # 1페이지부터 48페이지까지 순회
        for page in range(1, 49):
            url = f'https://finance.naver.com/sise/sise_market_sum.naver?sosok=0&page={page}'
            headers = {'User-Agent': 'Mozilla/5.0'}
            
            try:
                response = requests.get(url, headers=headers)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')
                
                stock_rows = soup.select('table.type_2 > tbody > tr[onmouseover]')
                
                for row in stock_rows:
                    cols = row.find_all('td')
                    item_tag = cols[1].find('a')
                    
                    if item_tag:
                        stock_name = item_tag.get_text(strip=True)
                        stock_code = item_tag['href'].split('code=')[1]
                        crawled_stocks[stock_code] = stock_name
                
                self.stdout.write(self.style.SUCCESS(f'{page}/48 페이지 크롤링 완료...'))
                time.sleep(0.5) # 서버에 부담을 주지 않기 위해 잠시 대기

            except requests.exceptions.RequestException as e:
                self.stderr.write(self.style.ERROR(f'{page} 페이지 크롤링 중 오류 발생: {e}'))
                continue
        
        self.stdout.write(self.style.SUCCESS(f'총 {len(crawled_stocks)}개의 종목을 크롤링했습니다.'))

        # --- 2. 데이터베이스와 동기화 ---
        # DB에 저장된 모든 종목 코드 가져오기
        db_stock_codes = set(Stock.objects.values_list('stock_code', flat=True))
        crawled_stock_codes = set(crawled_stocks.keys())

        # 상장 폐지된 종목 찾기 (DB에는 있지만 크롤링 결과에는 없는 종목)
        codes_to_delete = db_stock_codes - crawled_stock_codes
        if codes_to_delete:
            Stock.objects.filter(stock_code__in=codes_to_delete).delete()
            self.stdout.write(self.style.SUCCESS(f'{len(codes_to_delete)}개의 상장 폐지 종목을 삭제했습니다.'))

        # 신규 또는 업데이트할 종목 처리
        for stock_code, stock_name in crawled_stocks.items():
            # DB에 없으면 생성(created=True), 있으면 정보 업데이트(created=False)
            stock, created = Stock.objects.update_or_create(
                stock_code=stock_code,
                defaults={'stock_name': stock_name, 'market_type': 'KOSPI'}
            )
            if created:
                self.stdout.write(f'[추가] {stock.stock_name} ({stock.stock_code})')

        self.stdout.write(self.style.SUCCESS('데이터베이스 동기화가 성공적으로 완료되었습니다.'))