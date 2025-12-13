# 네이버 검색 API 예제 - 블로그 검색
# 주의: 이 파일은 예제 파일입니다. 실제 사용 시에는 naver_search.py를 참고하세요.
import urllib.request
import urllib.parse

# .env에서 네이버 검색 API 키 가져오기
try:
    from core.config import NAVER_SEARCH_CLIENT_ID, NAVER_SEARCH_CLIENT_SECRET
except ImportError:
    print("Error: core.config를 import할 수 없습니다. .env 파일을 확인하세요.")
    NAVER_SEARCH_CLIENT_ID = None
    NAVER_SEARCH_CLIENT_SECRET = None

if not NAVER_SEARCH_CLIENT_ID or not NAVER_SEARCH_CLIENT_SECRET:
    print("Error: NAVER_SEARCH_CLIENT_ID 또는 NAVER_SEARCH_CLIENT_SECRET이 .env 파일에 설정되지 않았습니다.")
else:
    encText = urllib.parse.quote("신촌 볼링")
    url = "https://openapi.naver.com/v1/search/local?query=" + encText+ "&display=10&sort=comment" # JSON 결과
    # url = "https://openapi.naver.com/v1/search/blog.xml?query=" + encText # XML 결과
    request = urllib.request.Request(url)
    request.add_header("X-Naver-Client-Id", NAVER_SEARCH_CLIENT_ID)
    request.add_header("X-Naver-Client-Secret", NAVER_SEARCH_CLIENT_SECRET)
    response = urllib.request.urlopen(request)
    rescode = response.getcode()
    if(rescode==200):
        response_body = response.read()
        print(response_body.decode('utf-8'))
    else:
        print("Error Code:" + rescode)