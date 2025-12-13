# API 호출 횟수 및 요금 확인 가이드

## 1. 스크립트를 사용한 자동 계산

### 기본 사용법

```bash
# 기본 시나리오 (참가자 3명, 도보/자동차/대중교통)
python3 check_api_usage.py --participants 3 --modes walk,drive,transit

# 참가자 수와 이동수단 변경
python3 check_api_usage.py --participants 5 --modes walk,drive

# 하이브리드 접근법 비활성화 (기존 그래프 기반 방법)
python3 check_api_usage.py --participants 3 --modes walk,drive,transit --no-hybrid

# 그리드 크기 조정
python3 check_api_usage.py --participants 3 --modes walk,drive,transit --grid-size 4
```

### 예상 결과 예시

```
참가자 수: 3
이동수단: walk, drive, transit
하이브리드 접근법: True
그리드 크기: 6x6
최종 후보 개수: 15

API 호출 횟수:
- Google Routes API:     153회
- Google Places API:     1회
- Naver Walking API:     51회
- Naver Geocoding API:   1회

Google API 예상 요금: $1.53 (약 1,989원)
Naver API 예상 요금: 0원 (무료 할당량 내)
```

## 2. Google Cloud Console에서 실제 사용량 확인

### 단계별 가이드

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com 접속
   - 프로젝트 선택

2. **API 및 서비스 > 사용량 및 할당량**
   - 좌측 메뉴: "API 및 서비스" > "사용량 및 할당량"
   - 또는 직접 URL: `https://console.cloud.google.com/apis/dashboard?project=YOUR_PROJECT_ID`

3. **Maps API 사용량 확인**
   - "Maps JavaScript API" 클릭
   - "Routes API" 클릭
   - "Directions API" 클릭
   - "Places API" 클릭
   - 각 API의 일일/월별 사용량 그래프 확인

4. **청구서 확인**
   - 좌측 메뉴: "청구" > "청구서"
   - 또는 직접 URL: `https://console.cloud.google.com/billing?project=YOUR_PROJECT_ID`
   - 월별 청구 내역 확인

### 주요 API별 요금 (2024년 기준)

#### Routes API
- **Basic Data**: $5.00 per 1,000 requests
- **Advanced Data** (traffic 포함): $10.00 per 1,000 requests
- 우리 코드는 Advanced Data 사용 (traffic 반영)

#### Directions API (Legacy)
- **Basic Data**: $5.00 per 1,000 requests
- **Advanced Data**: $10.00 per 1,000 requests
- Routes API 실패 시 fallback으로 사용

#### Places API
- **Nearby Search**: $32.00 per 1,000 requests
- 지하철역 검색에 사용

#### 무료 크레딧
- 신규 사용자: $200 무료 크레딧 (90일간)
- 매월 $200 크레딧이 제공되는 경우도 있음 (프로모션)

### 예상 요금 계산기

Google Cloud Console에서 제공하는 요금 계산기:
- https://cloud.google.com/maps-platform/pricing/sheet

## 3. Naver Cloud Platform에서 실제 사용량 확인

### 단계별 가이드

1. **NCP Console 접속**
   - https://console.ncloud.com 접속
   - 로그인

2. **Application Service > Maps**
   - 좌측 메뉴: "Application Service" > "Maps"
   - 또는 직접 URL: `https://console.ncloud.com/applicationService/maps`

3. **사용량 확인**
   - "사용량 통계" 메뉴 클릭
   - 일별/월별 API 호출 횟수 확인
   - 무료 할당량(1,000건) 초과 여부 확인

4. **청구 내역 확인**
   - 좌측 메뉴: "Billing" > "청구서"
   - 월별 청구 내역 확인

### Naver Maps API 요금 (2024년 기준)

#### 무료 할당량
- **월 1,000건 무료**
- Directions API, Geocoding API, Reverse Geocoding API 모두 포함

#### 초과 요금
- **건당 10원** (무료 할당량 초과 시)
- 예: 월 1,500건 사용 시 → 500건 × 10원 = 5,000원

#### API별 상세 요금
- **Directions API (자동차)**: 건당 10원
- **Directions API (도보)**: 건당 10원
- **Geocoding API**: 건당 10원
- **Reverse Geocoding API**: 건당 10원

### 요금 페이지
- https://www.ncloud.com/product/applicationService/maps

## 4. 코드에서 직접 로깅 추가

### 로깅 추가 예시

```python
# app/services/google_distance_matrix.py
import logging

log = logging.getLogger(__name__)

def get_travel_time_single(...):
    # API 호출 전
    log.info(f"[BILLING] Google API call: mode={mode}, start=({start_lat},{start_lng}), goal=({goal_lat},{goal_lng})")
    
    # API 호출 후
    if result:
        log.info(f"[BILLING] Google API success: duration={result.get('duration_seconds')}s")
    else:
        log.warning(f"[BILLING] Google API failed")
```

### 로그 분석

```bash
# Google API 호출 횟수 확인
grep "\[BILLING\] Google API call" app.log | wc -l

# Naver API 호출 횟수 확인
grep "\[BILLING\] Naver API call" app.log | wc -l
```

## 5. 예상 시나리오별 요금

### 시나리오 1: 참가자 3명 (도보/자동차/대중교통)
- **하이브리드 접근법 사용**
- **예상 호출 수**:
  - Google Routes API: ~150회
  - Google Places API: 1회
  - Naver Walking API: ~50회
  - Naver Geocoding: 1회
- **예상 요금**:
  - Google: $1.50 (약 1,950원)
  - Naver: 0원 (무료 할당량 내)
  - **총액: 약 1,950원**

### 시나리오 2: 참가자 5명 (모두 자동차)
- **하이브리드 접근법 사용**
- **예상 호출 수**:
  - Google Routes API: ~250회
  - Naver Geocoding: 1회
- **예상 요금**:
  - Google: $2.50 (약 3,250원)
  - Naver: 0원
  - **총액: 약 3,250원**

### 시나리오 3: 참가자 10명 (도보/자동차/대중교통 혼합)
- **하이브리드 접근법 사용**
- **예상 호출 수**:
  - Google Routes API: ~500회
  - Google Places API: 1회
  - Naver Walking API: ~200회
  - Naver Geocoding: 1회
- **예상 요금**:
  - Google: $5.00 (약 6,500원)
  - Naver: 0원 (무료 할당량 내)
  - **총액: 약 6,500원**

## 6. 비용 절감 팁

### 1. 그리드 크기 줄이기
```python
# grid_size를 6에서 4로 줄이면 후보 수가 36개 → 16개로 감소
find_optimal_location_hybrid(..., grid_size=4)
```

### 2. 최대 후보 수 제한
```python
# top_k를 15에서 10으로 줄이면 평가할 후보 수 감소
find_optimal_location_hybrid(..., top_k=10)
```

### 3. 캐싱 추가
- 동일한 출발지-도착지 쌍에 대해 결과 캐싱
- Redis나 메모리 캐시 사용

### 4. 병렬 처리 최적화
- 여러 후보를 동시에 평가하여 총 소요 시간 단축
- API 호출 수는 동일하지만 사용자 경험 개선

## 7. 모니터링 설정

### Google Cloud Monitoring
1. Cloud Console > Monitoring > Dashboards
2. Maps API 메트릭 추가
3. 알림 설정 (일일 사용량 초과 시)

### Naver Cloud Monitoring
1. NCP Console > Monitoring
2. Maps API 사용량 대시보드 생성
3. 무료 할당량 80% 도달 시 알림 설정

## 8. 참고 자료

- **Google Maps Platform 요금**: https://developers.google.com/maps/billing-and-pricing/pricing
- **Naver Maps API 요금**: https://www.ncloud.com/product/applicationService/maps
- **Google Cloud Console**: https://console.cloud.google.com
- **Naver Cloud Console**: https://console.ncloud.com


