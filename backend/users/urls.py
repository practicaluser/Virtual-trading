# backend/users/urls.py

from django.urls import path
from .views import SignupView, MyPageView, LogoutView, PasswordChangeView, WithdrawView 
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('mypage/', MyPageView.as_view(), name='mypage'), 
    path('logout/', LogoutView.as_view(), name='logout'), 
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
    path('withdraw/', WithdrawView.as_view(), name='withdraw'),
]