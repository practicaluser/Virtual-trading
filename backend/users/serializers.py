# backend/users/serializers.py

from rest_framework import serializers
from .models import User
from django.contrib.auth import update_session_auth_hash

class UserCreationSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('email', 'nickname', 'password') # 회원가입 시 받을 필드
        extra_kwargs = {
            'password': {'write_only': True} # password는 쓰기 전용으로 설정
        }

    def create(self, validated_data):
        # validated_data에서 'password' 값을 가져오고 기본 User 객체를 생성
        password = validated_data.pop('password', None)
        instance = self.Meta.model(**validated_data)

        # set_password를 통해 비밀번호를 해싱
        if password is not None:
            instance.set_password(password)
        instance.save()
        return instance
    

class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("기존 비밀번호가 일치하지 않습니다.")
        return value

    def update(self, instance, validated_data):
        # 비밀번호 변경
        instance.set_password(validated_data['new_password'])
        instance.save()

        # 비밀번호 변경 후에도 로그인 상태를 유지시킴
        update_session_auth_hash(self.context['request'], instance)
        
        return instance

    # update 메서드를 사용하므로 create는 필요 없음
    def create(self, validated_data):
        raise NotImplementedError()