from django.db import models


class Stock(models.Model):
    # ... 기존 필드 ...
    stock_code = models.CharField(max_length=10, primary_key=True)
    stock_name = models.CharField(max_length=100)
    market_type = models.CharField(max_length=10, default="KOSPI")

    # --- 아래 두 필드 추가 ---

    # 데이터가 처음 생성될 때의 시간이 자동으로 저장됨
    created_at = models.DateTimeField(auto_now_add=True)

    # 데이터가 업데이트될 때마다 시간이 자동으로 갱신됨
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.stock_code}] {self.stock_name}"
