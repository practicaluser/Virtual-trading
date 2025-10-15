from rest_framework.generics import CreateAPIView, RetrieveAPIView , UpdateAPIView, DestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView  
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserCreationSerializer, PasswordChangeSerializer 

# ... SignupView는 그대로 ...
class SignupView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreationSerializer



class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('email', 'nickname', 'date_joined')

class MyPageView(RetrieveAPIView):
    """
    로그인한 유저의 정보를 반환하는 API
    """
    permission_classes = [IsAuthenticated] # 로그인한 유저만 접근 가능!
    serializer_class = UserSerializer

    def get_object(self):
        # 요청을 보낸 유저 객체를 반환
        return self.request.user
    
# ▼▼▼▼▼ 아래 View를 추가해주세요 ▼▼▼▼▼
class LogoutView(APIView):
    """
    로그아웃 API
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)

class PasswordChangeView(UpdateAPIView):
    """
    비밀번호 변경 API
    """
    serializer_class = PasswordChangeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
    
class WithdrawView(DestroyAPIView):
    """
    회원 탈퇴 API
    """
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user