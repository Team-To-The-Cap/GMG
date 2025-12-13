# app/core/place_category.py
from typing import Literal, Optional

# 우리 서비스 내부 기준 카테고리
PlaceCategory = Literal[
    "restaurant",   # 맛집
    "cafe",         # 카페
    "activity",     # 액티비티
    "shopping",     # 소품샵
    "culture",      # 문화시설
    "nature",       # 자연관광
]

# Google place type -> 우리 카테고리
GOOGLE_TYPE_TO_CATEGORY: dict[str, Optional[PlaceCategory]] = {
    # Food & Drink
    "restaurant": "restaurant",
    "fast_food_restaurant": "restaurant",
    "meal_takeaway": "restaurant",
    "meal_delivery": "restaurant",
    "food": "restaurant",  # 일반 음식점
    "bar": "restaurant",
    "korean_restaurant": "restaurant",
    "japanese_restaurant": "restaurant",
    "chinese_restaurant": "restaurant",
    "italian_restaurant": "restaurant",
    "meal_delivery_service": "restaurant",  # 배달 음식점
    "food_court": "restaurant",  # 푸드코트

    "cafe": "cafe",
    "bakery": "cafe",
    "dessert_shop": "cafe",  # 디저트샵

    # Shopping
    "shopping_mall": "shopping",
    "department_store": "shopping",
    "clothing_store": "shopping",
    "book_store": "shopping",
    "pet_store": "shopping",
    "furniture_store": "shopping",

    # Leisure / tourism
    "amusement_park": "activity",
    "movie_theater": "activity",      # 원하면 culture 로 옮겨도 됨
    "tourist_attraction": "activity",
    "zoo": "activity",
    "spa": "activity",  # 스파/마사지
    "beauty_salon": "activity",  # 미용실
    "hair_care": "activity",  # 미용실

    "park": "nature",
    "campground": "nature",

    "museum": "culture",
    "library": "culture",

    # 나머지는 None (추천에서 안 씀)
}


def map_google_types_to_category(types: list[str]) -> Optional[PlaceCategory]:
    """
    Google place result 의 types 배열을 받아서
    우리 내부 PlaceCategory 하나로 매핑.
    """
    for t in types:
        cat = GOOGLE_TYPE_TO_CATEGORY.get(t)
        if cat is not None:
            return cat
    return None
