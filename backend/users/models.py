
# users/models.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
# PermissionsMixin, Group, Permission 임포트 제거

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
    # ▲▲▲▲▲ 여기까지 추가 ▲▲▲▲▲