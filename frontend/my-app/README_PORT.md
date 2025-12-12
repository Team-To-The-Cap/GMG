# 브랜치별 포트 설정 가이드

프론트엔드에서 브랜치별로 다른 백엔드 포트를 사용하는 방법입니다.

## 빠른 시작

### 1. 환경 변수 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성하세요:

```bash
cd frontend/my-app
cp .env.local.example .env.local
```

### 2. 브랜치별 포트 설정

`.env.local` 파일을 열어서 포트를 설정하세요:

**main 브랜치 (포트 8000):**
```env
VITE_API_PORT=8000
```

**develop 브랜치 (포트 8001):**
```env
VITE_API_PORT=8001
```

### 3. 개발 서버 재시작

환경 변수를 변경한 후에는 개발 서버를 재시작해야 합니다:

```bash
npm run dev
```

## 설정 방법

### 방법 1: 환경 변수 파일 사용 (권장)

`.env.local` 파일에 포트를 설정:

```env
VITE_API_PORT=8000
```

### 방법 2: 환경 변수 직접 지정

터미널에서 직접 지정:

```bash
# Linux/Mac
VITE_API_PORT=8000 npm run dev

# Windows (PowerShell)
$env:VITE_API_PORT=8000; npm run dev
```

### 방법 3: 전체 URL 지정

포트가 아닌 전체 URL을 지정하려면:

```env
VITE_API_BASE_URL=http://211.188.55.98:8000
```

## 브랜치별 자동 설정 (선택사항)

브랜치별로 자동으로 포트를 설정하려면 스크립트를 사용할 수 있습니다:

```bash
# 브랜치 이름 확인
git branch --show-current

# 브랜치별로 다른 .env.local 파일 사용
# 예: main 브랜치 → .env.local.main
#     develop 브랜치 → .env.local.develop
```

## 주의사항

1. **`.env.local` 파일은 git에 커밋하지 마세요** (이미 .gitignore에 포함되어 있을 것입니다)
2. 환경 변수를 변경한 후에는 **반드시 개발 서버를 재시작**해야 합니다
3. Capacitor 앱(iOS/Android)에서는 `VITE_API_BASE_URL`을 직접 지정하는 것이 더 확실합니다

## 문제 해결

### 포트가 변경되지 않아요
- 개발 서버를 재시작했는지 확인하세요
- `.env.local` 파일이 프로젝트 루트에 있는지 확인하세요
- 브라우저 캐시를 지우고 새로고침하세요

### CORS 오류가 발생해요
- 백엔드의 `app/main.py`에서 해당 포트가 CORS origins에 포함되어 있는지 확인하세요

