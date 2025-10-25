# backend/trading/urls.py

from django.urls import path

from . import views

urlpatterns = [
    # POST /api/trading/orders/ (주문 생성)
    # GET /api/trading/orders/ (주문 목록)
    path("orders/", views.OrderListCreateView.as_view(), name="order-list-create"),
    # GET /api/trading/portfolio/ (포트폴리오 목록)
    path("portfolio/", views.PortfolioListView.as_view(), name="portfolio-list"),
    # ▼▼▼▼▼ 미체결 주문 목록 조회 URL ▼▼▼▼▼
    # GET /api/trading/orders/pending/
    path(
        "orders/pending/",
        views.PendingOrderListView.as_view(),
        name="pending-order-list",
    ),
    # ▼▼▼▼▼ 주문 취소 URL ▼▼▼▼▼
    # POST /api/trading/orders/{order_id}/cancel/
    path(
        "orders/<int:order_id>/cancel/",
        views.CancelOrderView.as_view(),
        name="order-cancel",
    ),
]
