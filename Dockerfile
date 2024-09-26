# 베이스 이미지(도커허브의 오피셜 권장) 
FROM python:3.10-slim 
 

# 컨테이너의 작업 디렉토리를 설정 
WORKDIR /app 

 

# requirements.txt를 컨테이너의 작업 디렉토리로 복사 
COPY requirements.txt requirements.txt 
 

# 종속성 설치 
RUN pip install --no-cache-dir -r requirements.txt 

 

# 코드 파일 전체를 컨테이너의 작업 디렉토리로 복사 
# 디렉터리를 참조시킬거면 필요 없음 
# COPY . .  

 

# 애플리케이션 시작 명령어 
CMD ["uvicorn", "main:application", "--host", "0.0.0.0", "--port", "9000"] 