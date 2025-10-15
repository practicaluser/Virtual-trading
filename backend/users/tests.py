from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import User

class UserAuthAPITests(APITestCase):
    
    def setUp(self):
        """테스트 시작 전에 공통적으로 사용할 데이터를 설정합니다."""
        self.signup_url = reverse('signup')
        self.login_url = reverse('token_obtain_pair')
        self.refresh_url = reverse('token_refresh')
        self.mypage_url = reverse('mypage')
        self.logout_url = reverse('logout')

        self.user_data = {
            'email': 'testuser@example.com',
            'nickname': 'testnickname',
            'password': 'testpassword123'
        }
        # 테스트를 위한 사용자 미리 생성
        self.user = User.objects.create_user(**self.user_data)

    def test_signup_success(self):
        """1. 회원가입 성공 테스트"""
        print("1. 회원가입 성공 테스트 시작")
        data = {
            'email': 'newuser@example.com',
            'nickname': 'newnickname',
            'password': 'newpassword123'
        }
        response = self.client.post(self.signup_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email=data['email']).exists())
        print("-> 통과")

    def test_signup_fail_duplicate_email(self):
        """2. 중복 이메일 회원가입 실패 테스트"""
        print("2. 중복 이메일 회원가입 실패 테스트 시작")
        response = self.client.post(self.signup_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        print("-> 통과")

    def test_login_success_and_get_tokens(self):
        """3. 로그인 성공 및 토큰 발급 테스트"""
        print("3. 로그인 성공 및 토큰 발급 테스트 시작")
        login_data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        print("-> 통과")

    def test_login_fail_wrong_password(self):
        """4. 잘못된 비밀번호 로그인 실패 테스트"""
        print("4. 잘못된 비밀번호 로그인 실패 테스트 시작")
        login_data = {
            'email': self.user_data['email'],
            'password': 'wrongpassword'
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        print("-> 통과")

    def test_mypage_access_with_token(self):
        """5. 인증된 사용자의 마이페이지 접근 테스트"""
        print("5. 인증된 사용자의 마이페이지 접근 테스트 시작")
        # 먼저 로그인하여 토큰을 얻음
        login_response = self.client.post(self.login_url, {'email': self.user_data['email'], 'password': self.user_data['password']}, format='json')
        access_token = login_response.data['access']
        
        # 헤더에 Access Token을 포함하여 요청
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(self.mypage_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user_data['email'])
        print("-> 통과")

    def test_mypage_access_without_token(self):
        """6. 미인증 사용자의 마이페이지 접근 실패 테스트"""
        print("6. 미인증 사용자의 마이페이지 접근 실패 테스트 시작")
        response = self.client.get(self.mypage_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        print("-> 통과")

    def test_logout_and_blacklist_token(self):
        """7. 로그아웃 (토큰 블랙리스트) 테스트"""
        print("7. 로그아웃 (토큰 블랙리스트) 테스트 시작")
        # 로그인하여 토큰 발급
        login_response = self.client.post(self.login_url, {'email': self.user_data['email'], 'password': self.user_data['password']}, format='json')
        access_token = login_response.data['access']
        refresh_token = login_response.data['refresh']
        
        # 로그아웃 요청
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_response = self.client.post(self.logout_url, {'refresh': refresh_token}, format='json')
        self.assertEqual(logout_response.status_code, status.HTTP_205_RESET_CONTENT)
        
        # 블랙리스트에 등록된 리프레시 토큰으로 재발급 시도
        refresh_response = self.client.post(self.refresh_url, {'refresh': refresh_token}, format='json')
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)
        print("-> 통과")