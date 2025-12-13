# 브랜치별 독립 개발 환경 설정 가이드

두 명의 개발자가 다른 브랜치에서 독립적으로 백엔드/프론트엔드를 실행하고 테스트하는 방법입니다.

## 📋 목차

1. [백엔드 서버 실행](#백엔드-서버-실행)
2. [프론트엔드 설정](#프론트엔드-설정)
3. [시나리오별 사용법](#시나리오별-사용법)
4. [문제 해결](#문제-해결)

---

## 🔧 백엔드 서버 실행

### 방법 1: 포트 직접 지정 (권장)

```bash
cd backend

# 포트 8000으로 실행
python run_server.py --port 8000 --reload

# 포트 8001로 실행
python run_server.py --port 8001 --reload

# 또는 짧은 옵션
python run_server.py -p 8000 --reload
python run_server.py -p 8001 --reload
```

### 방법 2: 브랜치 기반 자동 선택

```bash
cd backend

# 브랜치 이름에 따라 자동으로 포트 선택
# main/master → 8000
# develop/dev → 8001
python run_server.py --reload
```

### 방법 3: 환경 변수 사용

```bash
cd backend

# 환경 변수로 포트 지정
PORT=8000 python run_server.py --reload
PORT=8001 python run_server.py --reload
```

---

## 💻 프론트엔드 설정

### 1. 환경 변수 파일 생성

프론트엔드 루트 디렉토리(`frontend/my-app/`)에 `.env.local` 파일을 생성합니다.

**개발자 A (포트 8000 사용):**

```env
# .env.local
VITE_API_PORT=8000
VITE_API_HOST=211.188.55.98
```

**개발자 B (포트 8001 사용):**

```env
# .env.local
VITE_API_PORT=8001
VITE_API_HOST=211.188.55.98
```

### 2. 프론트엔드 개발 서버 실행

```bash
cd frontend/my-app

# 환경 변수 파일을 읽고 개발 서버 시작
npm run dev
```

### 3. 환경 변수 확인

프론트엔드가 올바른 포트로 요청하는지 확인:

1. 브라우저 개발자 도구 → Network 탭
2. API 요청 URL 확인
3. `http://211.188.55.98:8000` 또는 `http://211.188.55.98:8001`로 요청이 가는지 확인

---

## 📝 시나리오별 사용법

### 시나리오 1: 개발자 A가 main 브랜치, 포트 8000 사용

**터미널 1 - 백엔드:**

```bash
cd backend
python run_server.py -p 8000 --reload
```

**터미널 2 - 프론트엔드:**

```bash
cd frontend/my-app
# .env.local 파일에 VITE_API_PORT=8000 설정
npm run dev
```

### 시나리오 2: 개발자 B가 develop 브랜치, 포트 8001 사용

**터미널 1 - 백엔드:**

```bash
cd backend
python run_server.py -p 8001 --reload
```

**터미널 2 - 프론트엔드:**

```bash
cd frontend/my-app
# .env.local 파일에 VITE_API_PORT=8001 설정
npm run dev
```

### 시나리오 3: 브랜치 기반 자동 포트 선택

**백엔드:**

```bash
cd backend
# 브랜치가 develop이면 자동으로 8001 사용
python run_server.py --reload
```

**프론트엔드:**

```bash
cd frontend/my-app
# .env.local에 VITE_API_PORT를 브랜치에 맞게 설정
npm run dev
```

---

## ⚙️ 환경 변수 우선순위

프론트엔드에서 API 포트 설정 우선순위:

1. **`.env.local`** (최우선, git에 커밋되지 않음)
2. **`.env`** (git에 커밋될 수 있음)
3. **기본값** (`8001`)

---

## 🔍 확인 방법

### 백엔드 포트 확인

서버 시작 시 출력되는 메시지 확인:

```
============================================================
🚀 FastAPI 서버 시작
============================================================
📍 포트: 8000 (명령줄 인자)
🌐 주소: http://0.0.0.0:8000
...
```

### 프론트엔드 포트 확인

1. 브라우저 개발자 도구 → Console
2. `import.meta.env.VITE_API_PORT` 값 확인
3. 또는 Network 탭에서 실제 요청 URL 확인

---

## ❗ 문제 해결

### 문제: 포트가 이미 사용 중

**해결:**

```bash
# 다른 포트 사용
python run_server.py -p 8002 --reload
```

그리고 프론트엔드 `.env.local`도 수정:

```env
VITE_API_PORT=8002
```

### 문제: 프론트엔드가 여전히 다른 포트로 요청

**확인 사항:**

1. `.env.local` 파일이 올바른 위치에 있는지 확인 (`frontend/my-app/.env.local`)
2. 환경 변수 이름이 정확한지 확인 (`VITE_API_PORT`)
3. 개발 서버를 재시작했는지 확인 (환경 변수 변경 시 필수)

### 문제: CORS 에러

백엔드 `app/main.py`에서 CORS 설정 확인:

- `localhost:5173`, `localhost:5174` 등이 허용되어 있는지 확인
- 서버 재시작 후 다시 시도

---

## 📌 빠른 참조

### 백엔드 서버 실행 옵션

```bash
# 기본 (브랜치 기반)
python run_server.py --reload

# 포트 직접 지정
python run_server.py -p 8000 --reload
python run_server.py -p 8001 --reload

# 환경 변수
PORT=8000 python run_server.py --reload

# 다른 호스트
python run_server.py --host 127.0.0.1 -p 8000 --reload
```

### 프론트엔드 환경 변수

`.env.local` 파일 예시:

```env
# API 서버 설정
VITE_API_HOST=211.188.55.98
VITE_API_PORT=8000

# 또는 전체 URL 사용
VITE_API_BASE_URL=http://211.188.55.98:8000
```

---

## 💡 팁

1. **`.env.local`은 git에 커밋하지 않기**: 각 개발자가 자신의 포트를 설정할 수 있습니다
2. **브랜치별로 다른 `.env.local` 파일 사용**:
   - `.env.local.main` → 포트 8000
   - `.env.local.develop` → 포트 8001
   - 필요시 심볼릭 링크 또는 스크립트로 자동 전환
3. **포트 충돌 방지**: 팀 내에서 포트 사용 현황을 공유하세요
