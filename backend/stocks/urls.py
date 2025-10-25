# backend/stocks/urls.py

from django.urls import path
from .views import (
    MarketIndexView,
    StockSearchView,
    StockDetailView,
    StockTimeTicksView,
    StockDailyPriceView,
)

urlpatterns = [
    # GET /api/stocks/market-index/ 로 요청이 오면 MarketIndexView를 실행
    path("market-index/", MarketIndexView.as_view(), name="market-index"),
    path("search/", StockSearchView.as_view(), name="stock-search"),
    path("detail/<str:stockCode>/", StockDetailView.as_view(), name="stock-detail"),
    path(
        "ticks/<str:stockCode>/<int:page>/",
        StockTimeTicksView.as_view(),
        name="stock-ticks",
    ),
    path(
        "daily/<str:stockCode>/<int:page>/",
        StockDailyPriceView.as_view(),
        name="stock-daily",
    ),
]
