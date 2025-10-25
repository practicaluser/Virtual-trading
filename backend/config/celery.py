# backend/config/celery.py

import os

from celery import Celery

# Django settings 모듈을 Celery의 기본 설정으로 지정
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")  # Django 프로젝트 이름으로 Celery 앱 생성

# Django settings.py 파일로부터 Celery 설정을 로드
# namespace='CELERY'는 settings.py의 모든 Celery 관련 설정 키 앞에 'CELERY_' 접두사를 붙여야 함을 의미
app.config_from_object("django.conf:settings", namespace="CELERY")

# Django 앱들의 tasks.py 파일에서 task들을 자동으로 찾아서 로드
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
