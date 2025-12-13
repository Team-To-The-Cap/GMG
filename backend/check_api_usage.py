#!/usr/bin/env python3
"""
API 호출 횟수 및 예상 요금 계산 스크립트

사용법:
    python check_api_usage.py --participants 3 --modes walk,drive,transit
"""

import argparse
from typing import List, Dict


def calculate_api_calls(
    num_participants: int,
    modes: List[str],
    use_hybrid: bool = True,
    grid_size: int = 6,
    top_k: int = 15,
    use_stations: bool = True,
) -> Dict[str, int]:
    """
    API 호출 횟수 계산
    
    Args:
        num_participants: 참가자 수
        modes: 이동수단 리스트 (예: ["walk", "drive", "transit"])
        use_hybrid: 하이브리드 접근법 사용 여부
        grid_size: 그리드 크기
        top_k: 최종 후보 개수
        use_stations: 지하철역 후보 사용 여부
    """
    calls = {
        "google_routes": 0,
        "google_directions": 0,
        "google_places": 0,  # 지하철역 검색
        "naver_walking": 0,
        "naver_driving": 0,
        "naver_geocoding": 0,  # 역지오코딩
    }
    
    if use_hybrid:
        # 하이브리드 접근법
        # 1. 지하철역 후보 생성 (대중교통 사용자 있을 때)
        has_transit = any(m in ["transit", "public", "대중교통"] for m in modes)
        if use_stations and has_transit:
            # Google Places API로 지하철역 검색 (1회)
            calls["google_places"] += 1
        
        # 2. 그리드 샘플링 후보
        grid_candidates = grid_size * grid_size  # 예: 6x6 = 36개
        
        # 3. 실제 API로 각 후보 평가
        total_candidates = grid_candidates
        if use_stations and has_transit:
            total_candidates += 15  # 지하철역 후보 최대 15개
        
        # 각 후보에 대해 각 참가자별로 API 호출
        for candidate_idx in range(min(total_candidates, 50)):  # 최대 50개 후보만 평가
            for participant_idx, mode in enumerate(modes):
                if mode in ["walk", "walking", "도보"]:
                    # Naver Walking API
                    calls["naver_walking"] += 1
                elif mode in ["drive", "driving", "자동차"]:
                    # Google Routes API (우선) 또는 Directions API (fallback)
                    calls["google_routes"] += 1
                elif mode in ["transit", "public", "대중교통"]:
                    # Google Routes API (TRANSIT 모드)
                    calls["google_routes"] += 1
        
        # 4. 역지오코딩 (최종 선택된 위치 1회)
        calls["naver_geocoding"] += 1
        
    else:
        # 기존 그래프 기반 방법
        # 후보 개수 (top_k)
        num_candidates = top_k
        
        # compute_minimax_travel_times에서 각 후보에 대해 각 참가자별로 호출
        for candidate_idx in range(num_candidates):
            for participant_idx, mode in enumerate(modes):
                if mode in ["walk", "walking", "도보"]:
                    # Naver Walking API
                    calls["naver_walking"] += 1
                elif mode in ["drive", "driving", "자동차"]:
                    # Google Routes API
                    calls["google_routes"] += 1
                elif mode in ["transit", "public", "대중교통"]:
                    # Google Routes API
                    calls["google_routes"] += 1
        
        # 역지오코딩
        calls["naver_geocoding"] += 1
    
    return calls


def estimate_google_costs(calls: Dict[str, int]) -> Dict[str, float]:
    """
    Google API 예상 요금 계산 (2024년 기준)
    
    참고: https://developers.google.com/maps/billing-and-pricing/pricing
    """
    # Google Routes API 요금 (2024년 기준)
    # - SKU: Routes API - Basic Data: $5.00 per 1,000 requests
    # - SKU: Routes API - Advanced Data: $10.00 per 1,000 requests (traffic 포함)
    routes_basic_cost_per_1k = 5.00
    routes_advanced_cost_per_1k = 10.00
    
    # Google Directions API (Legacy) 요금
    # - SKU: Directions API - Basic Data: $5.00 per 1,000 requests
    # - SKU: Directions API - Advanced Data: $10.00 per 1,000 requests
    directions_basic_cost_per_1k = 5.00
    directions_advanced_cost_per_1k = 10.00
    
    # Google Places API 요금
    # - Nearby Search: $32.00 per 1,000 requests
    places_cost_per_1k = 32.00
    
    # Routes API는 기본적으로 Advanced Data 사용 (traffic 포함)
    routes_cost = (calls["google_routes"] / 1000.0) * routes_advanced_cost_per_1k
    
    # Directions API는 fallback이므로 Basic Data로 가정
    directions_cost = (calls["google_directions"] / 1000.0) * directions_basic_cost_per_1k
    
    # Places API
    places_cost = (calls["google_places"] / 1000.0) * places_cost_per_1k
    
    total_cost = routes_cost + directions_cost + places_cost
    
    return {
        "routes_cost_usd": routes_cost,
        "directions_cost_usd": directions_cost,
        "places_cost_usd": places_cost,
        "total_cost_usd": total_cost,
        "total_cost_krw": total_cost * 1300,  # 환율 1300원 가정
    }


def estimate_naver_costs(calls: Dict[str, int]) -> Dict[str, float]:
    """
    Naver API 예상 요금 계산
    
    참고: https://www.ncloud.com/product/applicationService/maps
    """
    # Naver Maps API (NCP) 요금 (2024년 기준)
    # - 무료 할당량: 월 1,000건
    # - 초과 시: 건당 10원 (Directions API 기준)
    
    # 무료 할당량
    free_quota = 1000
    
    # 총 호출 수
    total_naver_calls = (
        calls["naver_walking"] + 
        calls["naver_driving"] + 
        calls["naver_geocoding"]
    )
    
    # 초과 호출 수
    excess_calls = max(0, total_naver_calls - free_quota)
    
    # 요금 계산 (건당 10원)
    cost_per_call = 10  # 원
    total_cost_krw = excess_calls * cost_per_call
    
    return {
        "total_calls": total_naver_calls,
        "free_quota": free_quota,
        "excess_calls": excess_calls,
        "total_cost_krw": total_cost_krw,
        "total_cost_usd": total_cost_krw / 1300,  # 환율 1300원 가정
    }


def main():
    parser = argparse.ArgumentParser(description="API 호출 횟수 및 예상 요금 계산")
    parser.add_argument(
        "--participants",
        type=int,
        default=3,
        help="참가자 수 (기본값: 3)",
    )
    parser.add_argument(
        "--modes",
        type=str,
        default="walk,drive,transit",
        help="이동수단 (쉼표로 구분, 기본값: walk,drive,transit)",
    )
    parser.add_argument(
        "--hybrid",
        action="store_true",
        default=True,
        help="하이브리드 접근법 사용 (기본값: True)",
    )
    parser.add_argument(
        "--grid-size",
        type=int,
        default=6,
        help="그리드 크기 (기본값: 6)",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=15,
        help="최종 후보 개수 (기본값: 15)",
    )
    
    args = parser.parse_args()
    
    modes = [m.strip() for m in args.modes.split(",")]
    
    print("=" * 60)
    print("API 호출 횟수 및 예상 요금 계산")
    print("=" * 60)
    print(f"참가자 수: {args.participants}")
    print(f"이동수단: {', '.join(modes)}")
    print(f"하이브리드 접근법: {args.hybrid}")
    if args.hybrid:
        print(f"그리드 크기: {args.grid_size}x{args.grid_size}")
    print(f"최종 후보 개수: {args.top_k}")
    print()
    
    # API 호출 횟수 계산
    calls = calculate_api_calls(
        num_participants=args.participants,
        modes=modes,
        use_hybrid=args.hybrid,
        grid_size=args.grid_size,
        top_k=args.top_k,
    )
    
    print("API 호출 횟수:")
    print("-" * 60)
    print(f"Google Routes API:     {calls['google_routes']:,}회")
    print(f"Google Directions API: {calls['google_directions']:,}회")
    print(f"Google Places API:     {calls['google_places']:,}회")
    print(f"Naver Walking API:     {calls['naver_walking']:,}회")
    print(f"Naver Driving API:     {calls['naver_driving']:,}회")
    print(f"Naver Geocoding API:   {calls['naver_geocoding']:,}회")
    print()
    
    # Google API 요금 계산
    google_costs = estimate_google_costs(calls)
    print("Google API 예상 요금:")
    print("-" * 60)
    print(f"Routes API:      ${google_costs['routes_cost_usd']:.4f} ({google_costs['routes_cost_usd'] * 1300:,.0f}원)")
    print(f"Directions API:  ${google_costs['directions_cost_usd']:.4f} ({google_costs['directions_cost_usd'] * 1300:,.0f}원)")
    print(f"Places API:      ${google_costs['places_cost_usd']:.4f} ({google_costs['places_cost_usd'] * 1300:,.0f}원)")
    print(f"총 요금:         ${google_costs['total_cost_usd']:.4f} ({google_costs['total_cost_krw']:,.0f}원)")
    print()
    
    # Naver API 요금 계산
    naver_costs = estimate_naver_costs(calls)
    print("Naver API 예상 요금:")
    print("-" * 60)
    print(f"총 호출 수:      {naver_costs['total_calls']:,}회")
    print(f"무료 할당량:     {naver_costs['free_quota']:,}회")
    print(f"초과 호출 수:    {naver_costs['excess_calls']:,}회")
    print(f"총 요금:         {naver_costs['total_cost_krw']:,.0f}원 (${naver_costs['total_cost_usd']:.4f})")
    print()
    
    # 총 요금
    total_cost_krw = google_costs['total_cost_krw'] + naver_costs['total_cost_krw']
    total_cost_usd = google_costs['total_cost_usd'] + naver_costs['total_cost_usd']
    print("=" * 60)
    print(f"전체 예상 요금: ${total_cost_usd:.4f} ({total_cost_krw:,.0f}원)")
    print("=" * 60)
    print()
    
    print("참고:")
    print("1. Google API 요금은 실제 사용량에 따라 달라질 수 있습니다.")
    print("2. Naver API는 월 1,000건까지 무료입니다.")
    print("3. Google API는 $200 무료 크레딧이 제공될 수 있습니다.")
    print("4. 실제 요금은 각 플랫폼의 요금 페이지에서 확인하세요:")
    print("   - Google: https://developers.google.com/maps/billing-and-pricing/pricing")
    print("   - Naver: https://www.ncloud.com/product/applicationService/maps")


if __name__ == "__main__":
    main()


