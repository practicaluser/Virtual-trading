import psycopg2

try:
    # 데이터베이스 연결
    conn = psycopg2.connect(
        # 여기를 변경!
        host="127.0.0.1",
        port="8765",
        dbname="stocksim_db",
        user="stocksim_user",
        password="stocksim_password"
    )

    # 커서 생성
    cur = conn.cursor()

    # 연결 성공 메시지 출력
    print("PostgreSQL 데이터베이스에 성공적으로 연결되었습니다.")

    # 간단한 쿼리 실행 (예: 버전 확인)
    cur.execute("SELECT version();")
    db_version = cur.fetchone()
    print("데이터베이스 버전:", db_version)

    # 커서와 연결 종료
    cur.close()
    conn.close()

except psycopg2.Error as e:
    print("데이터베이스 연결에 실패했습니다:", e)