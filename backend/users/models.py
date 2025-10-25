# backend/users/models.py

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
# PermissionsMixin, Group, Permission 임포트 제거
from decimal import Decimal
from django.conf import settings

class UserManager(BaseUserManager):
    def create_user(self, email, nickname, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        if not nickname:
            raise ValueError('The Nickname field must be set')
        
        email = self.normalize_email(email)
        user = self.model(email=email, nickname=nickname, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    # create_superuser 메소드 수정
    def create_superuser(self, email, nickname, password=None, **extra_fields):
        # is_superuser 관련 코드를 모두 제거합니다.
        # superuser는 is_staff=True만 갖도록 설정합니다.
        extra_fields.setdefault('is_staff', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')

        return self.create_user(email, nickname, password, **extra_fields)

# User 모델 상속 및 필드 수정
class User(AbstractBaseUser): # PermissionsMixin 상속 제거
    email = models.EmailField(unique=True, verbose_name='이메일')
    nickname = models.CharField(max_length=30, unique=True, verbose_name='닉네임')

    is_staff = models.BooleanField(default=False) # 관리자 페이지 접근 여부
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    # [추가된 필드]
    # 모의 투자용 가상 현금 (예: 기본값 천만원)
    cash_balance = models.DecimalField(
        verbose_name="예수금",
        max_digits=15,       # 최대 15자리 (소수점 포함)
        decimal_places=2,    # 소수점 2자리 (원 단위)
        default=Decimal('10000000.00')
    )

    # groups와 user_permissions 필드 완전히 삭제

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nickname']

    def __str__(self):
        return self.email
    
    # ▼▼▼▼▼ 이 부분을 추가해주세요 ▼▼▼▼▼
    # Django Admin 등에서 필요한 권한 관련 메서드들
    def has_perm(self, perm, obj=None):
        "Does the user have a specific permission?"
        # Simplest possible answer: Yes, always
        return True

    def has_module_perms(self, app_label):
        "Does the user have permissions to view the app `app_label`?"
        # Simplest possible answer: Yes, always
        return True
    

# ▼▼▼▼▼ [신규] 월말 자산 기록 모델 ▼▼▼▼▼
class AssetHistory(models.Model):
    """
    사용자의 월말 총 자산 스냅샷을 기록하는 모델
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="사용자"
    )
    # 날짜만 저장 (시간 불필요)
    snapshot_date = models.DateField(verbose_name="스냅샷 날짜")
    total_asset = models.DecimalField(
        max_digits=18, # 총 자산은 금액이 클 수 있으므로 넉넉하게
        decimal_places=2,
        verbose_name="총 자산"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")

    class Meta:
        verbose_name = "월말 자산 기록"
        verbose_name_plural = "월말 자산 기록 목록"
        # 한 사용자는 특정 날짜에 하나의 스냅샷만 가짐
        unique_together = ('user', 'snapshot_date')
        ordering = ['snapshot_date'] # 날짜순 정렬 기본값

    def __str__(self):
        return f"{self.user.nickname} - {self.snapshot_date}: {self.total_asset:,.0f}원"